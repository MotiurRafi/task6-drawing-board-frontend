import React, {useState} from "react";

export default function SearchBoard({ findBoard }) {
    const [query, setQuery] = useState(''); 
    const handleInputChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        findBoard(value);
    };

    return (
        <div className='SearchBoard mt-1' style={{height: "5%"}}>
            <input
                type='text'
                value={query}
                onChange={handleInputChange} 
                placeholder='Search'
                className='glass placeholdermodify'
            />
        </div>
    );
}
