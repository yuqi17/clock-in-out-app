
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { openDB } from 'idb';
import writeXlsxFile from 'write-excel-file'
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
});

function App() {
  const [clockInTime, setClockInTime] = useState();
  const [safeClockOutTime, setSafeClockOutTime] = useState();
  const [clockOutTime, setClockOutTime] = useState();
  const [disableBtnClockIn, setDisableBtnClockIn] = useState(false);
  const [isClockInTimeOk, setIsClockInTimeOk] = useState(true);
  const [isClockOutTimeOk, setIsClockOutTimeOk] = useState(true);

  const init = async () => {
    try {
      const response = await fetch('http://worldtimeapi.org/api/timezone/Asia/Shanghai');
      const { datetime } = await response.json();
      const currentTime = dayjs(datetime);
      const index = (await db).getFromIndex('attendance', 'date', currentTime.format('YYYY-MM-DD'));
      const data = await index;
      if (!data)
        return;
      setDisableBtnClockIn(!!data.clockInTime);// 已经打卡了就不能再打了
      setClockOutTime(data.clockOutTime);
      if (data.clockInTime) {
        setClockInTime(data.clockInTime);
        const safeClockOutTime = computeClockOutTime(dayjs(data.clockInTime));
        setSafeClockOutTime(safeClockOutTime);
      }
      if (data.clockOutTime) {
        setClockOutTime(data.clockOutTime);
      }
    } catch (error) {
      alert(error)
    }
  }

  useEffect(() => {
    dayjs.extend(isBetween);
    init();
  }, []);

  const recordClockInTime = async (date, clockInTime) => {
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
  }

  const recordClockOutTime = async (date, clockOutTime) => {
    // 查询今天有没有打卡
    const index = (await db).getFromIndex('attendance', 'date', date);
    const data = await (index);
    if (!data)
      return;
    (await db).put('attendance', {
      ...data,
      clockOutTime
    });
  }

  useEffect(() => {
    if (clockInTime) {
      const dateStr = dayjs(clockInTime).format('YYYY-MM-DD');
      setIsClockInTimeOk(dayjs(clockInTime).isBefore(`${dateStr} 10:30:00`));// 写在这里可以节省代码,不写在打卡的函数里
      recordClockInTime(dateStr, clockInTime);
    }
  }, [clockInTime]);

  useEffect(() => {
    if (clockOutTime) {
      const dateStr = dayjs(clockOutTime).format('YYYY-MM-DD');
      setIsClockOutTimeOk(dayjs(clockOutTime).isSame(safeClockOutTime) || dayjs(clockOutTime).isAfter(safeClockOutTime));
      recordClockOutTime(dateStr, clockOutTime);
    }
  }, [clockOutTime]);

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
      const safeClockOutTime = computeClockOutTime(currentTime);
      setSafeClockOutTime(safeClockOutTime);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleClockOut = async () => {
    const response = await fetch('http://worldtimeapi.org/api/timezone/Asia/Shanghai');
    const { datetime } = await response.json();
    const currentTime = dayjs(datetime);

    if (currentTime.isBefore(safeClockOutTime)) {
      if (!window.confirm('早于应打卡时间视为早退,是否继续打卡?')) {
        return;
      }
    }

    const clockOutTime = currentTime.format('YYYY-MM-DD HH:mm:ss');
    setClockOutTime(clockOutTime);
  };

  const handleExportExcel = async () => {

    const rows = await (await (db)).getAll('attendance');
    const schema = [
      {
        column: '日期',
        type: String,
        value: data => data.date,
        width: 15
      },
      {
        column: '上班打卡时间',
        type: String,
        value: data => data.clockInTime,
        width: 20
      },
      {
        column: '下班打卡时间',
        type: String,
        value: data => data.clockOutTime,
        width: 20
      },
    ]
    await writeXlsxFile(rows, {
      schema,
      fileName: '考勤.xlsx'
    })
  }

  return (
    <div className={styles.app}>
      <a onClick={handleExportExcel} className={styles.export}>导出为excel</a>
      <p>
        <button disabled={disableBtnClockIn} onClick={handleClockIn}>上班打卡</button>
      </p>
      <p>上班打卡时间为:<time className={isClockInTimeOk ? styles.ok : styles.danger}>{clockInTime}</time></p>
      {safeClockOutTime && (<p>应打卡时间为:<time style={{ fontSize: 25 }}>{safeClockOutTime}</time></p>)}
      <p>
        <button disabled={!disableBtnClockIn} onClick={handleClockOut}>下班打卡</button>
      </p>
      <p>下班打卡时间为:<time className={isClockOutTimeOk ? styles.ok : styles.danger}>{clockOutTime}</time></p>
    </div>
  )
}

export default App
