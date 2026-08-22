const fs = require('fs');
const file = 'src/app/components/AuthorDashboardPage.tsx';
let c = fs.readFileSync(file, 'utf8');

const targetStart = `{/* METRICS GRID */}`;
const targetEnd = `{/* Row 3: Granular Data Table */}`;

const startIndex = c.indexOf(targetStart);
let actualEnd = c.indexOf(targetEnd, startIndex);

if (startIndex === -1 || actualEnd === -1) {
    console.error("Target section not found", { startIndex, actualEnd });
    process.exit(1);
}

const replacementChunk = `{/* METRICS & PIE CHART GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Left Column: Stacked KPIs */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Card 1: Total Revenue */}
          <div className="dash-kpi-card emerald flex flex-col justify-between p-4 bg-emerald-500 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex-1">
            <div>
              <div className="flex items-start justify-between mb-3 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0 border border-white/10">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[9px] font-bold tracking-widest uppercase text-emerald-50 mb-0.5 relative z-10">Total Revenue</p>
              <h3 className="text-2xl font-black text-white tracking-tight relative z-10">₹{totalRevenue.toLocaleString('en-IN')}</h3>
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/20 flex justify-between text-[9px] font-bold uppercase tracking-widest text-white relative z-10">
              <span>Web: ₹{kpiSplits.web.revenue.toLocaleString('en-IN')}</span>
              <span>Events: ₹{kpiSplits.events.revenue.toLocaleString('en-IN')}</span>
              <span>Fairs: ₹{kpiSplits.bookFairs.revenue.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Card 2: Books Sold */}
          <div className="dash-kpi-card blue flex flex-col justify-between p-4 bg-blue-500 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex-1">
            <div>
              <div className="flex items-start justify-between mb-3 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0 border border-white/10">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[9px] font-bold tracking-widest uppercase text-blue-50 mb-0.5 relative z-10">Total Books Sold</p>
              <h3 className="text-2xl font-black text-white tracking-tight relative z-10">{totalBooksSold} <span className="text-[10px] font-medium text-blue-100 lowercase tracking-normal">units</span></h3>
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/20 flex justify-between text-[9px] font-bold uppercase tracking-widest text-white relative z-10">
              <span>Web: {kpiSplits.web.books}</span>
              <span>Events: {kpiSplits.events.books}</span>
              <span>Fairs: {kpiSplits.bookFairs.books}</span>
            </div>
          </div>

          {/* Card 3: Net Earnings */}
          <div className="dash-kpi-card amber flex flex-col justify-between p-4 bg-amber-500 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex-1">
            <div>
              <div className="flex items-start justify-between mb-3 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0 border border-white/10">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[9px] font-bold tracking-widest uppercase text-amber-50 mb-0.5 relative z-10">Net Earnings</p>
              <h3 className={\`text-2xl font-black tracking-tight relative z-10 \${(totalRevenue - totalFeesPaid) < 0 ? 'text-red-200' : 'text-white'}\`}>
                ₹{(totalRevenue - totalFeesPaid).toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/20 flex justify-between text-[9px] font-bold uppercase tracking-widest text-white relative z-10">
              <span>Gross: ₹{totalRevenue.toLocaleString('en-IN')}</span>
              <span>Fees: -₹{totalFeesPaid.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Right Column: PieChart: Sales by Channel */}
        <div className="lg:col-span-2 border border-paa-navy/5 p-5 md:p-6 rounded-2xl bg-white shadow-sm flex flex-col justify-between h-[450px]">
          <div>
            <h4 className="text-xs font-bold text-paa-navy uppercase tracking-widest mb-2">Sales by Channel</h4>
            <p className="text-[10px] text-gray-400 mb-6 font-medium">Split of total books sold per channel</p>
          </div>
          <div className="flex-1 w-full min-h-[300px]">
            {totalBooksSold === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">No channel data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Web Orders', value: kpiSplits.web.books },
                      { name: 'Events', value: kpiSplits.events.books },
                      { name: 'Book Fairs', value: kpiSplits.bookFairs.books }
                    ].filter(item => item.value > 0)}
                    cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={4} dataKey="value"
                  >
                    {[
                      { name: 'Web Orders', color: '#3b82f6' },
                      { name: 'Events', color: '#f59e0b' },
                      { name: 'Book Fairs', color: '#10b981' }
                    ].filter(c => (c.name === 'Web Orders' ? kpiSplits.web.books : c.name === 'Events' ? kpiSplits.events.books : kpiSplits.bookFairs.books) > 0).map((c, index) => (
                      <Cell key={\`cell-\${index}\`} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [\`\${value.toLocaleString('en-IN')}\`, 'Books Sold']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-6 flex justify-center gap-6 text-[10px] font-bold tracking-widest uppercase">
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></span> Web</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm"></span> Events</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></span> Fairs</span>
          </div>
        </div>
      </div>\n\n\n\n      `;

c = c.substring(0, startIndex) + replacementChunk + c.substring(actualEnd);
fs.writeFileSync(file, c);
console.log("Successfully replaced!");
