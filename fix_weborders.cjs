const fs = require('fs');
const file = 'src/app/components/WebOrdersTab.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/text-\[8px\]/g, 'text-xs');
code = code.replace(/text-\[9px\]/g, 'text-xs');
code = code.replace(/text-\[10px\]/g, 'text-xs');
code = code.replace(/text-\[11px\]/g, 'text-sm');
code = code.replace(/text-\[14px\]/g, 'text-sm');

const target1 = `      {[{ title: 'Bulk Orders', data: filteredBulkOrders, showFilters: true, isBulkSection: true, searchTerm: bulkSearchTerm, setSearchTerm: setBulkSearchTerm, statusFilter: bulkStatusFilter, setStatusFilter: setBulkStatusFilter }, { title: 'Web Orders', data: filteredWebOrders, showFilters: true, isBulkSection: false, searchTerm: webSearchTerm, setSearchTerm: setWebSearchTerm, statusFilter: webStatusFilter, setStatusFilter: setWebStatusFilter }].map((section, sectionIdx) => {
        const displayData = (section.isBulkSection && !showAllBulkOrders) ? section.data.slice(0, 5) : section.data;
        return (
      <div key={sectionIdx} className="bg-white border border-paa-navy/5 shadow-premium hover:shadow-premium-hover transition-all duration-500 ease-out flex flex-col mb-8">`;

const replacement1 = `      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start w-full">
        {[{ title: 'Bulk Orders', data: filteredBulkOrders, showFilters: true, isBulkSection: true, searchTerm: bulkSearchTerm, setSearchTerm: setBulkSearchTerm, statusFilter: bulkStatusFilter, setStatusFilter: setBulkStatusFilter }, { title: 'Web Orders', data: filteredWebOrders, showFilters: true, isBulkSection: false, searchTerm: webSearchTerm, setSearchTerm: setWebSearchTerm, statusFilter: webStatusFilter, setStatusFilter: setWebStatusFilter }].map((section, sectionIdx) => {
          const displayData = (section.isBulkSection && !showAllBulkOrders) ? section.data.slice(0, 5) : section.data;
          return (
        <div key={sectionIdx} className="bg-white border border-paa-navy/5 shadow-premium hover:shadow-premium-hover transition-all duration-500 ease-out flex flex-col h-full rounded-2xl overflow-hidden">`;

code = code.replace(target1, replacement1);

const target2 = `      </div>
      );})}

        {ordersMeta?.totalPages > 1 && (`;

const replacement2 = `        </div>
        );})}
      </div>

        {ordersMeta?.totalPages > 1 && (`;

code = code.replace(target2, replacement2);

fs.writeFileSync(file, code);
console.log('Fonts and layout updated!');
