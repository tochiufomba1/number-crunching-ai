export const EditCell = ({ row, table }) => {
    const meta = table.options.meta;

    const setEditedRows = (e: React.MouseEvent<HTMLButtonElement>) => {
        const elName = e.currentTarget.name
        meta?.setEditedRows((old: []) => ({
            ...old,
            [row.id]: !old[row.id],
        }))
        if (elName !== "edit") {
            if (e.currentTarget.name === "cancel") {
                meta?.revertData(row.index);
              } else {
                meta?.updateRow(row.index);
              }              
            //e.currentTarget.name === "cancel" ? meta?.revertData(row.index) : meta?.updateRow(row.index);
        }
    };

    return meta?.editedRows[row.id] ? (
        <>
            <button onClick={setEditedRows} name="cancel">
                X
            </button>{" "}
            <button onClick={setEditedRows} name="done">
                ✔
            </button>
        </>
    ) : (
        <button onClick={setEditedRows} name="edit">
            ✐
        </button>
    )
}