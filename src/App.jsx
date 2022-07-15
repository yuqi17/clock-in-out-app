
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { openDB, deleteDB, wrap, unwrap } from 'idb';
import { useEffect, useState } from 'react';
import styles from './App.module.scss'

const db = openDB('attendance-db', 1, {
  upgrade(db) {
    const store = db.createObjectStore('attendance', {
      keyPath: 'id',
      autoIncrement: true,
    });
    store.createIndex('date', 'date');
  },
})

function App() {
  const [clockInTime, setClockInTime] = useState();
  const [safeClockOutTime, setSafeClockOutTime] = useState();
  const [disableBtnClockIn, setDisableBtnClockIn] = useState(true);

  const init = async () => {
    try {
      const response = await fetch('http://worldtimeapi.org/api/timezone/Asia/Shanghai');
      const { datetime } = await response.json();
      const currentTime = dayjs(datetime);
      const index = (await db).getFromIndex('attendance', 'date', currentTime.format('YYYY-MM-DD'));
      const data = await index;
      setDisableBtnClockIn(!!data.clockInTime);// 已经打卡了就不能再打了
      if (data.clockInTime) {
        setClockInTime(data.clockInTime);
        const safeClockOutTime = computeClockOutTime(dayjs(data.clockInTime));
        setSafeClockOutTime(safeClockOutTime);
      }
    } catch (error) {
      alert(error)
    }

  }

  useEffect(() => {
    dayjs.extend(isBetween);
    init();
  }, []);

  const recordTime = async (date, clockInTime) => {
    // 查询今天有没有打卡
    const index = (await db).getFromIndex('attendance', 'date', date);
    const data = await (index);
    if (!data) {
      (await db).add('attendance', {
        date,
        clockInTime
      });
      setDisableBtnClockIn(true);
    }
    //  else {
    //   (await db).put('attendance', {
    //     ...data,
    //     clockInTime
    //   });
    // }

  }

  useEffect(() => {
    if (clockInTime) {
      recordTime(dayjs(clockInTime).format('YYYY-MM-DD'), clockInTime);
    }
  }, [clockInTime]);

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

  const handleClockIn = async () => {
    try {
      const response = await fetch('http://worldtimeapi.org/api/timezone/Asia/Shanghai');
      const { datetime } = await response.json();
      const currentTime = dayjs(datetime);
      const clockInTime = currentTime.format('YYYY-MM-DD HH:mm:ss');
      setClockInTime(clockInTime);// 通常比实际时间慢,可忽略不计
      const safeClockOutTime = computeClockOutTime(clockInTime);
      setSafeClockOutTime(safeClockOutTime);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleClockOut = () => {

  }

  return (
    <div className={styles.app}>
      <p>
        <button disabled={disableBtnClockIn} onClick={handleClockIn}>上班打卡</button>
      </p>
      <p>打卡时间为:<time>{clockInTime}</time></p>
      {safeClockOutTime && (<p>应打卡时间为:<time>{safeClockOutTime}</time></p>)}
      <p>
        <button onClick={handleClockOut}>下班打卡</button>
      </p>
    </div>
  )
}

export default App
