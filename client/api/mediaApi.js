import axios from "axios";

const BASE_URL = "http://localhost:5000/api/media";

export const fetchMedia = async () => {
  const res = await axios.get(BASE_URL);
  return res.data;
};

export const fetchMediaById = async (id) => {
  const res = await axios.get(`${BASE_URL}/${id}`);
  return res.data;
};