import Link from 'next/link'

export default function Download() {


    return (
        <div style={{display:'flex', justifyContent:'center', alignItems:'center', height: '100vh'}}>
            <div style={{ color: 'black', justifyContent: 'center', alignSelf: 'center' }}>
                <h1>Download Complete</h1>
                <Link href="/dashboard/upload" style={{ color: 'blue' }}>Upload more transactions here</Link>
            </div>
        </div>
    )
}