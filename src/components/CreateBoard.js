import React from 'react';

export default function CreateBoard({ userName, setUserName, boardName, setBoardName, handleBoardCreation }) {
  return (
    <div className='CreateBoard glass'>
        <input
          type='text'
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder='Your Name'
          className='glass'
        />
      <input
        type='text'
        value={boardName}
        onChange={(e) => setBoardName(e.target.value)}
        placeholder='Board Name'
        className='glass'
      />
      <button onClick={handleBoardCreation}>Create Board</button>
    </div>
  );
}
