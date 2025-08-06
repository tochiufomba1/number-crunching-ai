interface CardProps {
    title: string;
    children: React.ReactNode;
}

const Card = ({ title, children }: CardProps) => {
    return (
        <div style={{ display: "flex", flexDirection: "column", }}>
            <h2 style={{ color: '#101217' }}>{title}</h2>
            <div style={{ "display": "flex", "padding": "1rem", "flexDirection": "column", "justifyContent": "space-between", "borderRadius": "0.75rem", "backgroundColor": "#F9FAFB" }}>
                <div style={{ "paddingLeft": "1.5rem", "paddingRight": "1.5rem", "backgroundColor": "#ffffff", "color": 'black' }}>
                    {children}
                </div>
            </div>
        </div>
    )
}

export default Card;