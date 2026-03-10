import { useEffect } from "react"
import { useLocation } from "react-router-dom"

export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Select the main content area with overflow-y-auto to reset its scroll
    const mainContent = document.querySelector("main")
    if (mainContent) {
      mainContent.scrollTo(0, 0)
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname])

  return null
}
