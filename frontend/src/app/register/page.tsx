import styles from '@/app/login/page.module.css'
import RegistrationForm from '../ui/register/RegistrationForm'
import { Suspense } from 'react'

export default function Page() {


    return (
        <main className={styles.div1}>
            <div className={styles.div2}>
                <div className={styles.div3}>
                    <div className={styles.div4}>
                        <h3>Number Crunching AI</h3>
                    </div>
                </div>
                <Suspense>
                    <RegistrationForm />
                </Suspense>
            </div>
        </main>
    )
}