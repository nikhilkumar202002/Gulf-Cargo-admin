import React from 'react'
import { FaUsers, FaUserCheck, FaUserTimes, FaUserClock, FaTruck, FaInbox, FaBoxOpen, FaClock } from "react-icons/fa";
import "./Styles.css"

const Dashboard = () => {
  return (
    <>
      <section className='dashboard'>
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h1 className='dashboard-heading'>Overview</h1>
          </div>

          <div className="dashboard-row">
            <div className="dashboard-card">
              <div className="card-icon-text flex items-center gap-3">
                <div className="card-icon"><FaUsers/></div>
                <div className="card-text">Total Staffs</div>
              </div>
              <h1 className='card-staff-number'></h1>
            </div>
          </div>
        </div>
      </section>
</>
  );
}
export default Dashboard;