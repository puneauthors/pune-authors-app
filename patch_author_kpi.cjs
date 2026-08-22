const fs = require('fs');
const file = 'src/app/components/AuthorDashboardPage.tsx';
let c = fs.readFileSync(file, 'utf8');

const targetStart = '<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 mt-0">';
const startIndex = c.indexOf(targetStart);
if (startIndex === -1) {
    console.error("Target start not found");
    process.exit(1);
}

const targetEndStr = '          </div>\n          \n\n          <div className="flex flex-col gap-4 mb-4">';
let actualEnd = c.indexOf(targetEndStr, startIndex);

if (actualEnd === -1) {
    // try another end pattern
    actualEnd = c.indexOf('<div className="flex flex-col gap-4 mb-4">', startIndex);
    // backtrack to the closing div of the grid
    if (actualEnd !== -1) {
        let textBefore = c.substring(0, actualEnd);
        let lastDiv = textBefore.lastIndexOf('          </div>');
        if (lastDiv > startIndex) {
            actualEnd = lastDiv + 16; // '          </div>'.length
        }
    }
}

if (actualEnd === -1) {
    console.error("Target end not found");
    process.exit(1);
}

const replacementChunk = \`<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 mt-0">
            <div className="bg-emerald-500/85 p-3 rounded-xl border-none shadow-sm flex flex-col justify-center text-gray-900">
              <div className="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-1.5 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-gray-800" /> Event Participation</div>
              <div className="text-3xl font-black text-gray-900 tracking-tight">
                {dashboardData?.authorProfile?.aggEligibleEvents && dashboardData?.authorProfile?.aggEligibleEvents > 0 
                  ? \\\`\\\${\\Math.round((dashboardData.authorProfile.aggParticipatedEvents / dashboardData.authorProfile.aggEligibleEvents) * 100)}%\\\` 
                  : 'N/A'}
              </div>
              <div className="text-[10px] text-gray-800 mt-1 font-medium opacity-90">
                {dashboardData?.authorProfile?.aggParticipatedEvents || 0} / {dashboardData?.authorProfile?.aggEligibleEvents || 0} Events
              </div>
            </div>
            
            <div className="bg-cyan-500/85 p-3 rounded-xl border-none shadow-sm flex flex-col justify-center text-gray-900">
              <div className="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-1.5 flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-gray-800" /> Total Events</div>
              <div className="text-3xl font-black text-gray-900 tracking-tight">{dashboardData?.authorProfile?.aggEligibleEvents || 0}</div>
              <div className="text-[10px] text-gray-800 mt-1 font-medium opacity-90">Fairs: {dashboardData?.authorProfile?.aggEligibleFairs || 0} • Events: {dashboardData?.authorProfile?.aggEligibleEventsMeet || 0}</div>
            </div>
            
            <div className="bg-pink-500/85 p-3 rounded-xl border-none shadow-sm flex flex-col justify-center text-gray-900">
              <div className="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-1.5 flex items-center gap-2"><BookOpen className="w-4 h-4 text-gray-800" /> Total Books Sold</div>
              <div className="text-3xl font-black text-gray-900 tracking-tight">
                 {validParticipations.reduce((acc: number, evt: any) => {
                    let sold = 0;
                    if (evt.manualTotalSold !== null && evt.manualTotalSold !== undefined) {
                       sold = evt.manualTotalSold;
                    } else if (evt.isInvite) {
                       getEventBooks(evt.id).forEach((b: any) => sold += (b.soldStock || 0));
                    } else if (evt.isPast && evt.isDataUpdated) {
                       evt.books?.forEach((b: any) => sold += (b.soldStock || 0));
                    }
                    return acc + sold;
                 }, 0) + (dashboardData?.authorOrders || []).filter((o: any) => ['Pending Verification', 'Completed', 'Processing', 'Delivered', 'Dispatched', 'Accepted', 'Paid'].includes(o.status || o.orderStatus)).reduce((acc: number, curr: any) => acc + (curr.quantity || 1), 0)}
              </div>
            </div>
            
            <div className="bg-purple-500/85 p-3 rounded-xl border-none shadow-sm flex flex-col justify-center text-gray-900">
              <div className="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-1.5 flex items-center gap-2"><DollarSign className="w-4 h-4 text-gray-800" /> Total Revenue</div>
              <div className="text-3xl font-black text-gray-900 tracking-tight">
                 ₹{(
                   validParticipations.reduce((acc: number, evt: any) => {
                    let rev = 0;
                    if (evt.manualTotalRevenue !== null && evt.manualTotalRevenue !== undefined) {
                       rev = evt.manualTotalRevenue;
                    } else if (evt.isInvite) {
                       getEventBooks(evt.id).forEach((b: any) => rev += (b.soldStock || 0) * (b.overrideMrp || b.mrp || b.book?.mrp || 0));
                    } else if (evt.isPast && evt.isDataUpdated) {
                       evt.books?.forEach((b: any) => rev += (b.soldStock || 0) * (b.overrideMrp || b.mrp || b.book?.mrp || 0));
                    }
                    return acc + rev;
                 }, 0) + 
                 (dashboardData?.authorOrders || []).filter((o: any) => ['Pending Verification', 'Completed', 'Processing', 'Delivered', 'Dispatched', 'Accepted', 'Paid'].includes(o.status || o.orderStatus)).reduce((acc: number, curr: any) => acc + ((curr.quantity || 1) * (curr.amount / (curr.quantity || 1) || 0)), 0)
                 ).toLocaleString()}
              </div>
            </div>
            
            <div className="bg-rose-500/85 p-3 rounded-xl border-none shadow-premium flex flex-col justify-center cursor-pointer hover:shadow-md transition-all group text-gray-900" onClick={() => navigate('/dashboard/payments')}>
              <div className="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-1.5 flex items-center gap-2 group-hover:text-black transition-colors"><CheckCircle2 className="w-4 h-4 text-gray-800" /> Total Payments Done</div>
              <div className="text-3xl font-black text-gray-900 tracking-tight">₹{validParticipations.reduce((sum: number, evt: any) => sum + (evt.amountPaid || 0), 0).toLocaleString()}</div>
              <div className="text-[10px] text-gray-800 mt-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Click to view details &rarr;</div>
            </div>
            
            <div className="bg-blue-500/85 p-3 rounded-xl border-none shadow-sm flex flex-col justify-center text-gray-900">
              <div className="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-1.5 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gray-800" /> Event Profitability</div>
              <div className="text-3xl font-black text-gray-900 tracking-tight">
                 {(() => {
                    const totalRev = validParticipations.reduce((acc: number, evt: any) => {
                       let rev = 0;
                       if (evt.manualTotalRevenue !== null && evt.manualTotalRevenue !== undefined) {
                          rev = evt.manualTotalRevenue;
                       } else if (evt.isInvite) {
                          getEventBooks(evt.id).forEach((b: any) => rev += (b.soldStock || 0) * (b.overrideMrp || b.mrp || b.book?.mrp || 0));
                       } else if (evt.isPast && evt.isDataUpdated) {
                          evt.books?.forEach((b: any) => rev += (b.soldStock || 0) * (b.overrideMrp || b.mrp || b.book?.mrp || 0));
                       }
                       return acc + rev;
                    }, 0) + (dashboardData?.authorOrders || []).filter((o: any) => ['Pending Verification', 'Completed', 'Processing', 'Delivered', 'Dispatched', 'Accepted', 'Paid'].includes(o.status || o.orderStatus)).reduce((acc: number, curr: any) => acc + ((curr.quantity || 1) * (curr.amount / (curr.quantity || 1) || 0)), 0);
                    const totalPaid = validParticipations.reduce((sum: number, evt: any) => sum + (evt.amountPaid || 0), 0);
                    const net = totalRev - totalPaid;
                    return <span className={net >= 0 ? "text-gray-900" : "text-red-900"}>{net >= 0 ? '+' : '-'}₹{Math.abs(net).toLocaleString()}</span>;
                 })()}
              </div>
            </div>
          </div>\`;

c = c.substring(0, startIndex) + replacementChunk + c.substring(actualEnd);
fs.writeFileSync(file, c);
console.log("Successfully replaced!");
