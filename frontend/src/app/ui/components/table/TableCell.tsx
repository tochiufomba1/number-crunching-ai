import { useState, useEffect, ChangeEvent } from "react";
import "./table.css";
import Modal from "../modal/Modal";
import AddVendorForm from "../AddVendor-form";

export const TableCell = ({ getValue, row, column, table }) => {
  const initialValue = getValue();
  const columnMeta = column.columnDef.meta;
  const tableMeta = table.options.meta;
  const [value, setValue] = useState(initialValue);
  const { description } = row.original;

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onBlur = () => {
    tableMeta?.updateData(row.index, column.id, value);
  };

  const onSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setValue(e.target.value);
    tableMeta?.updateData(row.index, column.id, e.target.value);
  };

  const onSearchChange = (item: string) => {
    setValue(item);
    tableMeta?.updateData(row.index, column.id, item);
  }

  // const onClick = (item) => {
  //   setValue(item);
  //   tableMeta?.updateData(row.index, column.id, item);
  // };

  if (tableMeta?.editedRows[row.id]) {
    return columnMeta?.type === "select" ? (
      //<SearchBar handleClick={onClick} />
      <select onChange={onSelectChange} value={initialValue}>
        {columnMeta?.options?.map((option: string) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    ) : columnMeta?.type === "search" ? (
      <Search value={description} handleClick={onSearchChange} options={columnMeta?.options} setAdd={columnMeta?.setAdd} />
      //<div></div> // Import search bar component
    ) : (
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        type={columnMeta?.type || "text"}
      />
    );
  }
  return <span>{value}</span>;
};


interface SearchProps {
  value: string;
  handleClick: (string) => void;
  options: string[];
  setAdd?: unknown;
}


// FIX: onChange vs onClick
function Search({ value, handleClick, options, setAdd }: SearchProps) {
  const [query, setQuery] = useState<string>("");
  const [, setFocused] = useState<boolean>(false);
  const [addVendorModalOpen, setAddVendorModalOpen] = useState<boolean>(false);


  // Make more sophisticated
  const filteredItems = options.filter((item) =>
    item.toLowerCase().includes(query.toLowerCase())
  );

  // console.log(`Filter: ${filteredItems}`)

  return (
    <>
      {addVendorModalOpen &&
        <Modal
          isOpen={addVendorModalOpen}
          onClose={() => setAddVendorModalOpen(false)}
          hasCloseBtn={true}>
          <AddVendorForm value={value} />
        </Modal>
      }
      <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", position: "relative" }}>
        <input
          type="text"
          placeholder={value}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          style={{
            padding: "10px",
            width: "100%",
            marginBottom: "20px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
        {query &&
          <ul style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            position: 'absolute',
            top: '48px', // 100%
            left: 0,
            right: 0,
            border: '1px solid #ccc',
            background: 'white',
            zIndex: 10,
            maxHeight: '200px',
            overflowY: 'auto',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            // overflow: 'visible'
          }}>
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) =>
                <li style={{
                  padding: '8px',
                  cursor: 'pointer', borderBottom: '1px solid #eee'
                }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f0f0f0"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "white"}
                  key={index} onClick={() => { handleClick(item); setQuery(item); }}>
                  {item}
                </li>)
            ) : setAdd ? (
              <li onClick={() => setAddVendorModalOpen(true)}
                style={{
                  padding: '10px',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f0f0f0"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "white"}
              >
                Add new vendor</li>
            ) : <li style={{ padding: '10px' }}>No entries found</li>}
          </ul>
        }
      </div>
    </>
  );
};
