
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useEffect, useState } from 'react';
import styles from './App.module.scss'

function App() {
  const [clockInTime, setClockInTime] = useState();
  const [clockOutTime, setClockOutTime] = useState();
  useEffect(() => {
    dayjs.extend(isBetween)
  }, []);
  const computeClockOutTime = currentTime => {
    if (currentTime.isAfter(`${dateStr} 10:30:00`))
      throw new Error('超过10:30到岗, 且未请假记缺勤0.5天!');
    const dateStr = currentTime.format('YYYY-MM-DD');
    const normalClockOutTime = '18:00:00';
    if (currentTime.isBefore(`${dateStr} 9:00:00`))
      return normalClockOutTime;
    const rangeMap = {
      "9:00:00-9:30:00": minutes => dayjs(`${dateStr} ${normalClockOutTime}`).add(1 * minutes, 'minutes'),
      "9:31:00-10:00:00": minutes => dayjs(`${dateStr} ${normalClockOutTime}`).add(1 * minutes + 2 * 7, 'minutes'),
      "10:01:00-11:30:00": minutes => dayjs(`${dateStr} ${normalClockOutTime}`).add(1 * minutes + 2 * 30 + 3 * 5, 'minutes'),
    };
    let clockOutTime = null;
    Object.keys(rangeMap).forEach(range => {
      const [start, end] = range.split('-');
      const hint = currentTime.isBetween(`${dateStr} ${start}`, `${dateStr} ${end}`, "minute", "[]");
      if (hint) {
        return clockOutTime = rangeMap[range](currentTime.minute());
      }
    });
    return clockOutTime && clockOutTime.format('YYYY-MM-DD HH:mm:ss');
  };
  const handleClockIn = async () => {
    const response = await fetch('http://worldtimeapi.org/api/timezone/Asia/Shanghai');
    const { datetime } = await response.json();
    const currentTime = dayjs(datetime);
    try {
      setClockInTime(currentTime.format('YYYY-MM-DD HH:mm:ss'));// 通常比实际时间慢,可忽略不计
      const time = computeClockOutTime(currentTime)
      setClockOutTime(time);
    } catch (error) {
      alert(error.message);
    }
  };
  return (
    <div className={styles.app}>
      <button onClick={handleClockIn}>上班打卡</button>
      <p>打卡时间为:<time>{clockInTime}</time></p>
      {clockOutTime && (<p>应打卡时间为:<time>{clockOutTime}</time></p>)}
    </div>
  )
}

export default App
