import React from 'react'
import _ from 'lodash';

export default function App() {
  const handle = () => console.log('clicked');
  const handleThrottle = _.throttle(handle, 3000);
  const handleDebounce = _.debounce(handle, 3000);

  const handleChange = (e) => console.log(e.target.value);
  const handleChangeDebounce = _.debounce(handleChange, 3000);
  const handleChangeThrottle = _.throttle(handleChange, 3000);

  return (
    <div>
      <button onClick={handle}>click me fast</button>
      <button onClick={handleThrottle}>click me throttle</button>
      <button onClick={handleDebounce}>click me debounce</button>
      <p>
        <input onChange={handleChange} placeholder='请输入' /><br />
        <input onChange={handleChangeDebounce} placeholder='请输入debounce' /><br />
        <input onChange={handleChangeThrottle} placeholder='请输入throttle' />
      </p>
    </div>
  )
}
