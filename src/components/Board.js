import React from 'react'

export default function Board({ board }) {
    function formatDateTime(dateString) {
        const date = new Date(dateString);
      
        const hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
      
        return `${hours}:${minutes} ${day}-${month}-${year}`;
      }
      const imageUrl = board.thumbnail ? board.thumbnail : '';

    return (
        <div className='Board glass relative'>
            <h4>{board.name} </h4>
            <p className='f-1 monospace'>By-- {(board.author)}</p>
            <p className='f-1 monospace'>At-- {formatDateTime(board.createdAt)}</p>
            {board.thumbnail ?
                (<img src={imageUrl} alt='Thumbnail' />) :
                (<div className='emptyThumbnail'>Thumbnail</div>)
            }
        </div>
    )
}
