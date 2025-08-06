'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function Search({ placeholder }: { placeholder: string }) {
  return (
    <div style={{display: 'flex', position: 'relative', flex: "1 1 0%"}}>
      <label htmlFor="search" style={{position: "absolute", width: "1px", height: "1px", padding: "0", margin:"-1px", overflow:"hidden", clipPath:"rect(0, 0, 0, 0)", whiteSpace: "nowrap", borderWidth:"0"}}>
        Search
      </label>
      <input
        style={{"display":"block","paddingLeft":"2.5rem","borderRadius":"0.375rem","borderWidth":"1px","borderColor":"#E5E7EB","outlineWidth":"2px","width":"100%","fontSize":"0.875rem","lineHeight":"1.25rem"}}
        placeholder={placeholder}
      />
      <MagnifyingGlassIcon style={{"position":"absolute","left":"0.75rem","top":"50%","color":"#6B7280","height":"18px","width":"18px"}} />
    </div>
  );
}
