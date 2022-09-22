
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useEffect, useState } from 'react';
import styles from './App.module.scss'

function App() {
  const [clockInTime, setClockInTime] = useState();
  const [result, setResult] = useState('');

  useEffect(() => {
    dayjs.extend(isBetween);
  }, []);

  const computeClockOutTime = clockInTime => {
    const dateStr = clockInTime.format('YYYY-MM-DD');
    if (clockInTime.isAfter(`${dateStr} 10:30:00`))
      throw new Error('超过10:30到岗, 且未请假记缺勤0.5天!');
    const normalClockOutTime = '18:00:00';
    if (clockInTime.isBefore(`${dateStr} 9:00:00`))
      return normalClockOutTime;
    const rangeMap = {
      "9:00:00-9:30:00": minutes => dayjs(`${dateStr} ${normalClockOutTime}`).add(1 * minutes, 'minutes'),
      "9:31:00-10:00:00": minutes => dayjs(`${dateStr} ${normalClockOutTime}`).add(1 * minutes + 2 * 7, 'minutes'),
      "10:01:00-11:30:00": minutes => dayjs(`${dateStr} ${normalClockOutTime}`).add(1 * minutes + 2 * 30 + 3 * 5, 'minutes'),
    };
    let safeClockOutTime = null;
    Object.keys(rangeMap).forEach(range => {
      const [start, end] = range.split('-');
      const hint = clockInTime.isBetween(`${dateStr} ${start}`, `${dateStr} ${end}`, "minute", "[]");
      if (hint) {
        return safeClockOutTime = rangeMap[range](clockInTime.minute());
      }
    });
    return safeClockOutTime && safeClockOutTime.format('YYYY-MM-DD HH:mm:ss');
  };


  return (
    <div className={styles.app}>
      <input onChange={e => setClockInTime(e.target.value)} placeholder='eg: 输入 10:30 然后回车' onKeyDown={e => {
        if (e.key === 'Enter') {
          try {
            const dateTimeStr = `${dayjs().format('YYYY-MM-DD')} ${clockInTime}:00`;
            setResult(computeClockOutTime(dayjs(dateTimeStr)))
          } catch (error) {
            alert(error.message)
          }
        }
      }} />
      <p>{result}</p>
    </div>
  )
}

export default App
