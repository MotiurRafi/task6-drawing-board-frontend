import { useState, useEffect } from 'react';
import './App.css';
import BoardList from './components/BoardList';
import DrawingBoard from './components/DrawingBoard';
import { getBoard, createBoard, getBoards } from './api';
import CreateBoard from './components/CreateBoard';
import debounce from 'lodash.debounce';

function App() {
  const [drawingData, setDrawingData] = useState('');
  const [boards, setBoards] = useState([]);
  const [userName, setUserName] = useState('');
  const [boardName, setBoardName] = useState('');
  const [currentBoardId, setCurrentBoardId] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const storedUserName = localStorage.getItem('uName');
    if (storedUserName) {
      setUserName(storedUserName);
    }
    fetchBoardsDebounced();
  }, []);

  const handleBoardCreation = async () => {
    if (!userName || !boardName) {
      alert('Please fill in all fields');
      return;
    }
    localStorage.setItem('uName', userName);
    try {
      await createBoard({ name: boardName, author: userName });
      setBoardName('');
      setPage(1);
      setBoards([]);
      fetchBoards(1);
    } catch (error) {
      console.error('Error creating board:', error);
    }
  };
  const fetchBoardsDebounced = debounce(() => fetchBoards(1), 300);
  const fetchBoards = async (page) => {
    try {
      const response = await getBoards(page);
      if (response.data.length < 5) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      setBoards((prevBoards) => [...prevBoards, ...response.data]);
      if (response.data.length === 5) {
        setPage(page + 1);
      }
    } catch (error) {
      console.error("Error fetching boards:", error);
      setHasMore(false);
    }
  };


  const fetchBoard = async (id) => {
    setCurrentBoardId(id);
    try {
      const response = await getBoard(id);
      setDrawingData(response.data.data);
      setCurrentBoardId(response.data.id)
    } catch (error) {
      console.error("Error fetching drawing data:", error);
    }
  };

  return (
    <div className="App">
      <div className='aside'>
        <CreateBoard
          userName={userName}
          setUserName={setUserName}
          boardName={boardName}
          setBoardName={setBoardName}
          handleBoardCreation={handleBoardCreation}
        />
        <BoardList
          boards={boards}
          fetchBoard={fetchBoard}
          page={page}
          hasMore={hasMore}
          currentBoardId={currentBoardId}
          setCurrentBoardId={setCurrentBoardId}
          fetchBoards={fetchBoards}
        />
      </div>
      <DrawingBoard
        setBoards={setBoards}
        boardId={currentBoardId}
        drawingData={drawingData}
        fetchBoards={fetchBoards}
      />
    </div>
  );
}

export default App;
