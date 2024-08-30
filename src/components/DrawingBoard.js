import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { updateBoard } from '../api';
import imageCompression from 'browser-image-compression';
import debounce from 'lodash.debounce';

export default function DrawingBoard({ setBoards, boardId, drawingData }) {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const canvasInstanceRef = useRef(null);
  const isReceiving = useRef(false);
  const [brushType, setBrushType] = useState('Pencil');
  const [brushWidth, setBrushWidth] = useState(3);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('#FFFFFF');
  const [fontStyle, setFontStyle] = useState('normal');
  const [fontWeight, setFontWeight] = useState('normal');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState(20);
  const [fontColor, setFontColor] = useState('#000000');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  useEffect(() => {
    if (!canvasInstanceRef.current) {
      const fabric = window.fabric;
      const canvas = new fabric.Canvas(canvasRef.current);
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.width = brushWidth;
      canvas.freeDrawingBrush.color = strokeColor;
      canvasInstanceRef.current = canvas;

      socketRef.current = io('https://task6-drawing-board-backend.onrender.com');

      socketRef.current.emit('join-room', boardId);

      const emitDrawingData = async () => {
        if (!isReceiving.current) {
          await handleProgressSaving()
          const canvasData = canvas.toJSON();
          console.log("emiting data", canvasData)
          socketRef.current.emit('drawing', canvasData);
        }
      };

      canvas.on('mouse:up', emitDrawingData);
      canvas.on('object:modified', emitDrawingData);
      canvas.on('object:added', emitDrawingData);

      socketRef.current.on('drawing', ({ boardId, canvasData }) => {
        isReceiving.current = true;
        console.log("receieved data", canvasData)
        canvas.loadFromJSON(canvasData, () => {
          canvas.renderAll();
          isReceiving.current = false;
        });
      });
    }

    socketRef.current.on('disconnect', handleProgressSaving);

    if (drawingData) {
      const canvas = canvasInstanceRef.current;
      try {
        const parsedData = typeof drawingData === 'string' ? JSON.parse(drawingData) : drawingData;
        isReceiving.current = true;
        canvas.loadFromJSON(parsedData, () => {
          canvas.renderAll();
          isReceiving.current = false;
        });
      } catch (error) {
        console.error('Error parsing or loading drawing data:', error, drawingData);
      }
    }

    return () => {
      if (canvasInstanceRef.current) {
        canvasInstanceRef.current.dispose();
        canvasInstanceRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [drawingData, boardId]);

  const handleProgressSaving = debounce(async () => {
    if (!boardId) return;

    const canvas = canvasInstanceRef.current;
    if (canvas) {
      const tempCanvas = document.createElement('canvas');
      const scaleFactor = 0.5;
      tempCanvas.width = canvas.width * scaleFactor;
      tempCanvas.height = canvas.height * scaleFactor;
      const tempContext = tempCanvas.getContext('2d');
      tempContext.fillStyle = '#FFFFFF';
      tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      const dataURL = canvas.toDataURL('image/jpeg', 0.6);
      const img = new Image();
      img.src = dataURL;
      img.onload = async () => {
        tempContext.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
        const finalThumbnailDataURL = tempCanvas.toDataURL('image/jpeg', 0.6);
        try {
          const imgResponse = await fetch(finalThumbnailDataURL);
          const blob = await imgResponse.blob();
          const compressedBlob = await imageCompression(blob, {
            maxSizeMB: 0.1,
            maxWidthOrHeight: 800,
            useWebWorker: true,
          });
          const formData = new FormData();
          formData.append('image', compressedBlob, 'thumbnail.jpg');
          formData.append('canvasData', JSON.stringify(canvas.toJSON()));
          const response = await updateBoard({ id: boardId, formData });
          const updatedBoard = response.data;
          setThumbnailUrl(updatedBoard.thumbnail);
          setBoards((prevBoards) =>
            prevBoards.map((board) =>
              board.id === updatedBoard.id ? updatedBoard : board
            )
          );
        } catch (error) {
          console.error('Error saving data:', error);
        }
      };
      img.onerror = () => {
        console.error('Error loading image for saving progress.');
      };
    }
  }, 300);

  const handleBrushTypeChange = (e) => {
    const selectedBrush = e.target.value;
    setBrushType(selectedBrush);
    const canvas = canvasInstanceRef.current;
    const fabric = window.fabric;
    let BrushClass;
    switch (selectedBrush) {
      case 'Pencil':
        BrushClass = fabric.PencilBrush;
        break;
      case 'Circle':
        BrushClass = fabric.CircleBrush;
        break;
      case 'Spray':
        BrushClass = fabric.SprayBrush;
        break;
      case 'Eraser':
        BrushClass = fabric.EraserBrush;
        canvas.freeDrawingBrush = new BrushClass(canvas);
        canvas.freeDrawingBrush.selectable = false;
        canvas.freeDrawingBrush.evented = false;
        const background = canvas.getObjects().find(obj => obj.type === 'rect' && !obj.selectable);
        if (background) {
          background.selectable = false;
          background.evented = false;
          background.erasable = false;
        }
        return;
      default:
        console.error(`${selectedBrush}Brush is not a valid brush type`);
        return;
    }
    setDrawingMode(true);
    canvas.freeDrawingBrush = new BrushClass(canvas);
    canvas.freeDrawingBrush.width = brushWidth;
    canvas.freeDrawingBrush.color = strokeColor;
  };
  const handleBrushWidthChange = (e) => {
    const width = parseInt(e.target.value, 10);
    setBrushWidth(width);
    const canvas = canvasInstanceRef.current;
    if (canvas) {
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        activeObject.set({ strokeWidth: width });
        canvas.renderAll();
        socketRef.current.emit('drawing', canvas.toJSON());
      } else {
        canvas.freeDrawingBrush.width = width;
      }
    }
  };

  const handleStrokeColorChange = (e) => {
    const color = e.target ? e.target.value : e;
    setStrokeColor(color);

    const canvas = canvasInstanceRef.current;
    if (canvas) {
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        activeObject.set({ stroke: color });
        canvas.renderAll();
        socketRef.current.emit('drawing', canvas.toJSON());
      } else {
        canvas.freeDrawingBrush.color = color;
      }
    }
  };

  const handleFillColorChange = (e) => {
    const color = e.target ? e.target.value : e;
    setFillColor(color);

    const canvas = canvasInstanceRef.current;
    if (canvas) {
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        activeObject.set({ fill: color });
        canvas.renderAll();
        socketRef.current.emit('drawing', canvas.toJSON());
      }
    }
  };

  const setDrawingMode = (isDrawing) => {
    const canvas = canvasInstanceRef.current;
    canvas.isDrawingMode = isDrawing;
  };

  const handleFontStyleChange = (e) => {
    setFontStyle(e.target.value);
    updateActiveTextbox({ fontStyle: e.target.value });
  };

  const handleFontWeightChange = (e) => {
    setFontWeight(e.target.value);
    updateActiveTextbox({ fontWeight: e.target.value });
  };

  const handleFontFamilyChange = (e) => {
    setFontFamily(e.target.value);
    updateActiveTextbox({ fontFamily: e.target.value });
  };

  const handleFontSizeChange = (e) => {
    setFontSize(parseInt(e.target.value, 10));
    updateActiveTextbox({ fontSize: parseInt(e.target.value, 10) });
  };
  const handleFontColorChange = (e) => {
    setFontColor(e.target.value);
    updateActiveTextbox({ fill: e.target.value });
  };

  const updateActiveTextbox = (updates) => {
    const canvas = canvasInstanceRef.current;
    if (canvas) {
      const activeObject = canvas.getActiveObject();
      if (activeObject && activeObject.type === 'textbox') {
        activeObject.set(updates);
        canvas.renderAll();
        socketRef.current.emit('drawing', canvas.toJSON());
      }
    }
  };


  const addShape = (shapeType) => {
    const canvas = canvasInstanceRef.current;
    const fabric = window.fabric;
    setDrawingMode(false);

    let shape;
    const commonOptions = {
      left: 100,
      top: 100,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth: brushWidth,
    };

    switch (shapeType) {
      case 'Circle':
        shape = new fabric.Circle({ ...commonOptions, radius: 30 });
        break;
      case 'Rectangle':
        shape = new fabric.Rect({ ...commonOptions, width: 60, height: 40 });
        break;
      case 'Square':
        shape = new fabric.Rect({ ...commonOptions, width: 50, height: 50 });
        break;
      case 'Triangle':
        shape = new fabric.Triangle({ ...commonOptions, width: 50, height: 50 });
        break;
      default:
        return;
    }

    canvas.add(shape);
    canvas.setActiveObject(shape);
    socketRef.current.emit('drawing', canvas.toJSON());
  };

  const addTextbox = () => {
    const canvas = canvasInstanceRef.current;
    const fabric = window.fabric;
    setDrawingMode(false);

    const textbox = new fabric.Textbox('Hello World', {
      left: 100,
      top: 100,
      width: 200,
      fontSize: fontSize,
      fontFamily: fontFamily,
      fontWeight: fontWeight,
      fontStyle: fontStyle,
      fill: fontColor,
    });

    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    socketRef.current.emit('drawing', canvas.toJSON());
  };

  const handleDeleteSelected = () => {
    const canvas = canvasInstanceRef.current;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.remove(activeObject);
      socketRef.current.emit('drawing', canvas.toJSON());
    }
  };

  const downloadCanvasAsImage = () => {
    const canvas = canvasInstanceRef.current;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempContext = tempCanvas.getContext('2d');

    tempContext.fillStyle = '#FFFFFF';
    tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
    });
    const img = new Image();
    img.onload = () => {
      tempContext.drawImage(img, 0, 0);
      const finalDataURL = tempCanvas.toDataURL({
        format: 'png',
        quality: 1,
      });

      const link = document.createElement('a');
      link.href = finalDataURL;
      link.download = 'canvas.png';
      link.click();
    };
    img.src = dataURL;
  };

  return (
    <div className='DrawingBoard'>
      <canvas ref={canvasRef} width={1410} height={685} id="c"></canvas>
      <div id="drawing-options" className='glass'>
        <div className='glass stroke-box'>
          <label htmlFor="stroke-color">Stroke</label>
          <div className='input-box'>
            <input type="color" id="stroke-color" value={strokeColor} onChange={handleStrokeColorChange} />
            <button onClick={() => handleStrokeColorChange('rgba(0,0,0,0)')}><img src='/transparent-icon.png' alt='' /></button>
          </div>
        </div>
        <div className='glass fill-box'>
          <label htmlFor="fill-color">Fill</label>
          <div className='input-box'>
            <input type="color" id="fill-color" value={fillColor} onChange={handleFillColorChange} />
            <button onClick={() => handleFillColorChange('rgba(0,0,0,0)')}><img src='/transparent-icon.png' alt='' /></button>
          </div>
        </div>
        <div className='brush-type-box glass'>
          Brush
          <div className='brush-type'>
            <button onClick={() => handleBrushTypeChange({ target: { value: 'Pencil' } })}><i className="fa-solid fa-pencil"></i></button>
            <button onClick={() => handleBrushTypeChange({ target: { value: 'Circle' } })}><img src='/bubble-icon.png' alt='' /></button>
            <button onClick={() => handleBrushTypeChange({ target: { value: 'Spray' } })}><img src='/dots-icon.png' alt='' /></button>
            <button onClick={() => handleBrushTypeChange({ target: { value: 'Eraser' } })}><i className="fa-solid fa-eraser"></i></button>
          </div>
        </div>
        <div className='glass size-box'>
          <label htmlFor="brush-width">Size</label>
          <input type="number" id="brush-width" min="1" max="99" value={brushWidth} onChange={handleBrushWidthChange} /><br />
        </div>
        <div className='glass font-box mono'>
          Font Tools
          <div className='font-options'>
            <button onClick={addTextbox}><img src='/textbox-icon.png' alt='' /></button>
            <select id="font-style" className='mono' value={fontStyle} onChange={handleFontStyleChange}>
              <option value="normal">N/A</option>
              <option value="italic">Italic</option>
            </select>
            <select id="font-weight" className='mono' value={fontWeight} onChange={handleFontWeightChange}>
              <option value="normal">N/A</option>
              <option value="bold">Bold</option>
            </select>
            <select id="font-family" className='mono' value={fontFamily} onChange={handleFontFamilyChange}>
              <option value="Arial">Arial</option>
              <option value="Courier New">Courier New</option>
              <option value="Georgia">Georgia</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Verdana">Verdana</option> mono
            </select>
            <input type="number" id="font-size" className='mono' min="1" max="100" value={fontSize} onChange={handleFontSizeChange} />
            <input type="color" id="font-color" value={fontColor} onChange={handleFontColorChange} />
          </div>
        </div>
        <div className='shapes-box glass'>
          Shapes
          <div className='shape-options'>
            <button onClick={() => addShape('Circle')}><i className="fa-regular fa-circle"></i></button>
            <button onClick={() => addShape('Rectangle')}> &#9645;</button>
            <button onClick={() => addShape('Square')}><i className="fa-regular fa-square-full"></i></button>
            <button onClick={() => addShape('Triangle')}>&#9651;</button>
          </div>
        </div>
        <button className='glass select' onClick={() => { setDrawingMode(false) }}><img src='/pick-icon.png' alt='' /></button>
        <button className='glass selected-clear' onClick={handleDeleteSelected}><img src='/delete-selected-icon.png' alt='' /></button>
        <button className='export glass' onClick={downloadCanvasAsImage}><i className="fa-solid fa-download"></i></button>
      </div>
    </div>
  );
}