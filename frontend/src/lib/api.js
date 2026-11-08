import axios from "axios";
import { fmtMoney, fmtNum, fmtDate, timeAgo } from "@/utils/formatters";
import { STATUS_STYLES } from "@/constants/statusStyles";

const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
  withCredentials: true,
});

export { fmtMoney, fmtNum, fmtDate, timeAgo, STATUS_STYLES };
export default api;
