import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:5000/api/boards', 
    headers: {
        'Content-Type': 'application/json',
    }
}) 
const APIformdata = axios.create({
    baseURL: 'http://localhost:5000/api/boards',
    headers: {
        'Content-Type': 'multipart/form-data',
    }
}) 

export const getBoards = (page) => API.get(`/get-boards?page=${page}`);
export const createBoard = (board) => API.post('/create-board', board);
export const getBoard = (id) => API.get(`/get-board/${id}`);
export const updateBoard = ({id, formData}) => APIformdata.put(`/update-board/${id}`, formData);
export const searchBoard = (query) => API.get(`/search-board?query=${query}`)
