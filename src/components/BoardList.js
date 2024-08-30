import React, { useState } from 'react';
import Board from './Board';
import SearchBoard from './SearchBoard';
import { searchBoard } from '../api';

export default function BoardList({ boards, page, fetchBoard, hasMore, currentBoardId, fetchBoards }) {
  const [searchedBoards, setSearchedBoards] = useState([]);

  const findBoard = async (query) => {
    if (query === '') return setSearchedBoards([]);
    try {
      const response = await searchBoard(query);
      setSearchedBoards(response.data);
    } catch (error) {
      console.error("Error searching boards", error);
    }
  };

  const handleLoadMore = () => {
    if (hasMore) {
      fetchBoards(page);
    }
  };

  const renderBoards = (boardList) => (
    boardList.length > 0 ? (
      <div>
        <ul className='ul-lsn m-0 p-0'>
          {boardList.map(board => (
            <li key={board.id} onClick={() => fetchBoard(board.id)} className={currentBoardId === board.id ? 'selected' : ''}>
              <Board board={board} />
            </li>
          ))}
        </ul>
        {hasMore && (
          <button onClick={handleLoadMore} className="load-more-button">
            Load More
          </button>
        )}
      </div>
    ) : (
      <li>No Boards</li>
    )
  );

  return (
    <div className='BoardList m--1'>
      <div className='boards h-full glass ptb-1' style={{ overflowY: "scroll", overflowX: "hidden" }}>
        <SearchBoard findBoard={findBoard} />
        {searchedBoards.length > 0 ? (
          renderBoards(searchedBoards)
        ) : (
          renderBoards(boards)
        )}
      </div>
    </div>
  );
}
