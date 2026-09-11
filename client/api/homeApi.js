import axios from "axios";

const BASE_URL = "http://localhost:5000/api/home";

export const fetchHomeFeed = async (token) => {
  const res = await axios.get(BASE_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};