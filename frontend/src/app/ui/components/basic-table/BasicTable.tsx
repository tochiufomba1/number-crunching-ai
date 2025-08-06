function BasicTable({ data }) {
    return (
        <table>
            <thead>
                <tr>
                    {Object.keys(data[0]).map((key) => (
                        <th key={key}>{key}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {data.map((row, index) => (
                    <tr key={index}>
                        {Object.values(row).map((value, index) => (
                            <td key={index}>{value as string}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default BasicTable;
