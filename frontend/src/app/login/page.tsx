import LoginForm from '@/app/ui/login/login-form';
import { Suspense } from 'react';
import styles from "./page.module.css" //'@/app/login/page.module.css'

export default function LoginPage() {
    return (
        <main className={styles.div1}>
            <div className={styles.div2}>
                <div className={styles.div3}>
                    <div className={styles.div4}>
                        <h3>Number Crunching AI</h3>
                    </div>
                </div>
                <Suspense>
                    <LoginForm />
                </Suspense>
                {/* <Suspense>
          <LoginForm />
        </Suspense> */}
            </div>
        </main>
    );
}