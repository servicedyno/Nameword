import React from 'react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

// Public/marketing shell. Dark ("Midnight Vault") is the default theme; light is cool graphite.
const MainLayout = ({ children, fluid = false }) => {
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen flex flex-col text-primary dark:text-gray-100">
      <Navbar />
      <div className={fluid ? "flex-1" : "px-5 mb-10 flex-1"}>
        {children}
      </div>
      <Footer />
    </div>
  )
}

export default MainLayout
