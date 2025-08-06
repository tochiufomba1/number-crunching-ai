import React from "react";
import SideNav from "../ui/dashboard/sidenav";
import styles from "./dashboard.module.css"

export default function Layout({ children }: {children: React.ReactNode}){
    return (
        <div className={styles.layoutContainer}>
            <div className={styles.sidenavContainer}>
                <SideNav />
            </div>
            <div className={styles.childrenContainer}>{children}</div>
        </div>
    )
}