import React from 'react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import LiveChat from '../components/LiveChat'
// import Loader from '../components/common/Loader'

const MainLayout = ({children, fluid = false}) => {
  const showChat = import.meta.env.VITE_SHOW_CHAT === "true" || import.meta.env.VITE_SHOW_CHAT === true;

  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen flex flex-col">
      {/* <Loader /> */}
      <Navbar />
      <div className={fluid ? "flex-1" : "px-5 mb-10 flex-1"}>
        {children}
      </div>
      <Footer />
      {showChat && <LiveChat />}
    </div>
  )
}

export default MainLayout
