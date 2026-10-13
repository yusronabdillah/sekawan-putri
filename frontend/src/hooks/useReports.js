import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useCategoryStore } from '../store/store';

export function useReports(period, customStartDate, customEndDate) {
  const parentMapping = useCategoryStore(state => state.parentMapping) || {};
  
  const data = useLiveQuery(async () => {
    try {
      // 1. Determine Date Range
      const now = new Date();
      let start, end;
      let periodLabel = '';
      
      const formatLabel = (date) => date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      if (period === 'today') {
        start = new Date(now.setHours(0,0,0,0));
        end = new Date(now.setHours(23,59,59,999));
        periodLabel = `Hari Ini (${formatLabel(now)})`;
      } else if (period === 'yesterday') {
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        start = new Date(yest.setHours(0,0,0,0));
        end = new Date(yest.setHours(23,59,59,999));
        periodLabel = `Kemarin (${formatLabel(start)})`;
      } else if (period === 'this_week') {
        const wStart = new Date();
        wStart.setDate(wStart.getDate() - wStart.getDay());
        start = new Date(wStart.setHours(0,0,0,0));
        end = new Date();
        periodLabel = `${formatLabel(start)} - ${formatLabel(end)}`;
      } else if (period === 'this_month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        periodLabel = `${formatLabel(start)} - ${formatLabel(end)}`;
      } else if (period === 'custom') {
        start = new Date(customStartDate);
        end = new Date(customEndDate);
        periodLabel = `${formatLabel(start)} - ${formatLabel(end)}`;
      } else { // All time
        start = new Date(0);
        end = new Date();
        periodLabel = 'Semua Waktu';
      }

      // 2. Fetch Data from local Dexie
      let txs = await db.transactions
        .filter(t => new Date(t.created_at) >= start && new Date(t.created_at) <= end)
        .toArray();
      txs.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      
      let exps = await db.expenses
        .filter(e => new Date(e.created_at) >= start && new Date(e.created_at) <= end)
        .toArray();
      exps.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        
      let cashSessions = await db.cash_sessions
        .filter(c => new Date(c.opened_at) >= start && new Date(c.opened_at) <= end)
        .toArray();
      cashSessions.sort((a,b) => new Date(a.opened_at) - new Date(b.opened_at));

      const allProducts = await db.products.toArray();

      // Warehouse Data
      let auditLogs = [];
      let restocks = [];
      try {
        auditLogs = await db.audit_logs
          .filter(a => new Date(a.created_at) >= start && new Date(a.created_at) <= end)
          .toArray();
        auditLogs.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
          
        restocks = await db.restock_requests
          .filter(r => new Date(r.created_at) >= start && new Date(r.created_at) <= end)
          .toArray();
        restocks.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
          
        // Enhance with product info
        for (const log of auditLogs) {
          if (log.product_id) {
            const prod = await db.products.get(log.product_id);
            if (prod) log.product_name = prod.name;
          }
          if (log.user_id) {
            const u = await db.users.get(log.user_id);
            if (u) log.user_name = u.name || u.username;
          }
        }
        
        for (const req of restocks) {
          if (req.product_id) {
            const prod = await db.products.get(req.product_id);
            if (prod) req.product_name = prod.name;
          }
          if (req.created_by) {
            const u = await db.users.get(req.created_by);
            if (u) req.created_by_name = u.name || u.username;
          }
        }
      } catch (err) {}

      // 3. Process Transactions
      const lastClosed = {};
      const lastClosedByTime = {};
      cashSessions.forEach(s => {
         if (!s.closed_at) return; // Ignore Buka Kas (Manual) for shift boundaries
         
         const cat = s.closed_category || 'Semua';
         const timeStr = s.closed_at;
         const time = new Date(timeStr).getTime();
         
         if (cat === 'Semua') {
            if (time > (lastClosed['Semua'] || 0)) {
               lastClosed['Semua'] = time;
               lastClosedByTime['Semua'] = timeStr;
            }
         } else {
            if (time > (lastClosed[cat] || 0)) {
               lastClosed[cat] = time;
               lastClosedByTime[cat] = timeStr;
            }
         }
      });

      let income = 0;
      let unclosedIncome = 0;
      let unclosedCostTotal = 0;
      const incomeByCategory = {};
      const parentIncomeByCategory = {};
      const unclosedParentIncomeByCategory = {};
      const unclosedParentCostByCategory = {};
      let costTotal = 0; // For gross profit
      let totalItems = 0;
      let totalItemsSayur = 0;
      
      let cashIn = 0;
      let qrisIn = 0;
      let transferIn = 0;
      let cashRefund = 0;
      let unclosedCashIn = 0;
      let unclosedQrisIn = 0;
      let unclosedTransferIn = 0;
      let unclosedCashRefund = 0;
      let voidCount = 0;
      
      const methodCounts = {};
      const productCounts = {};
      const cashierMap = {}; // { cashier_id: { ...metrics } }

      // Enhance txs with user, customer info, and items
      const enhancedTxs = [];
      for (const tx of txs) {
        
        // Cashier logic initialization
        if (!cashierMap[tx.cashier_id]) {
          const user = await db.users.get(tx.cashier_id);
          cashierMap[tx.cashier_id] = {
            cashier_name: user ? user.name || user.username : 'Unknown',
            total_sales: 0,
            total_tx: 0,
            total_items: 0,
            total_items_sayur: 0,
            total_void: 0,
            total_refund: 0,
            total_discount: 0,
            last_login: user ? user.last_login || '-' : '-'
          };
        }
        
        const c = cashierMap[tx.cashier_id];

        if (tx.status === 'COMPLETED') {
          const totalAmt = Number(tx.total_amount) || 0;
          const discountAmt = Number(tx.discount) || 0;
          income += totalAmt;
          methodCounts[tx.payment_method] = (methodCounts[tx.payment_method] || 0) + 1;
          
          const txTime = new Date(tx.created_at).getTime();
          const lastGlobalClosed = lastClosed['Semua'] || 0;

          if (tx.payment_method === 'CASH') {
             cashIn += totalAmt;
             if (txTime > lastGlobalClosed) unclosedCashIn += totalAmt;
          }
          if (tx.payment_method === 'QRIS') {
             qrisIn += totalAmt;
             if (txTime > lastGlobalClosed) unclosedQrisIn += totalAmt;
          }
          if (tx.payment_method === 'TRANSFER') {
             transferIn += totalAmt;
             if (txTime > lastGlobalClosed) unclosedTransferIn += totalAmt;
          }
          
          if (txTime > lastGlobalClosed) {
             unclosedIncome += totalAmt;
          }

          c.total_sales += totalAmt;
          c.total_tx += 1;
          c.total_discount += discountAmt;
        } else if (tx.status === 'VOID') {
          voidCount++;
          c.total_void += 1;
        } else if (tx.status === 'REFUND') {
          if (tx.payment_method === 'CASH') {
             const refAmt = Number(tx.total_amount) || 0;
             cashRefund += refAmt;
             const txTime = new Date(tx.created_at).getTime();
             if (txTime > (lastClosed['Semua'] || 0)) unclosedCashRefund += refAmt;
          }
          c.total_refund += 1;
        }

        // Get Items
        const items = await db.transaction_items.where('transaction_id').equals(tx.id).toArray();
        const enhancedItems = [];
        
        for (const item of items) {
          const prod = await db.products.get(item.product_id);
          
          let cat = 'Lainnya';
          if (prod && prod.category) {
            cat = prod.category;
          }
          
          if (tx.status === 'COMPLETED') {
            const itemPrice = Number(item.price) || 0;
            const itemQty = Number(item.qty) || 0;
            const amount = itemPrice * itemQty;
            incomeByCategory[cat] = (incomeByCategory[cat] || 0) + amount;
            
            let parentCat = parentMapping[cat] || 'Lainnya';
            
            parentIncomeByCategory[parentCat] = (parentIncomeByCategory[parentCat] || 0) + amount;

            const txTime = new Date(tx.created_at).getTime();
            const lastCatClosed = Math.max(lastClosed[parentCat] || 0, lastClosed['Semua'] || 0);
            if (txTime > lastCatClosed) {
              unclosedParentIncomeByCategory[parentCat] = (unclosedParentIncomeByCategory[parentCat] || 0) + amount;
            }
          }

          if (prod && tx.status === 'COMPLETED') {
            const qtyNumForCost = Number(item.qty) || 0;
            const costPriceNum = Number(prod.cost_price) || 0;
            const costAmount = costPriceNum * qtyNumForCost;
            costTotal += costAmount;
            
            let parentCat = parentMapping[cat] || 'Lainnya';
            const txTime = new Date(tx.created_at).getTime();
            const lastCatClosed = Math.max(lastClosed[parentCat] || 0, lastClosed['Semua'] || 0);
            const lastGlobalClosed = lastClosed['Semua'] || 0;
            
            if (txTime > lastCatClosed) {
               unclosedParentCostByCategory[parentCat] = (unclosedParentCostByCategory[parentCat] || 0) + costAmount;
            }
            if (txTime > lastGlobalClosed) {
               unclosedCostTotal += costAmount;
            }
            
            const qtyNum = Number(item.qty) || 0;
            if (cat === 'Sayur') {
              totalItemsSayur += qtyNum;
              productCounts[prod.name] = (productCounts[prod.name] || 0) + qtyNum;
            } else {
              totalItems += qtyNum;
              productCounts[prod.name] = (productCounts[prod.name] || 0) + qtyNum;
            }
            
            if (cat === 'Sayur') {
              c.total_items_sayur += qtyNum;
            } else {
              c.total_items += qtyNum;
            }
          }
          
          enhancedItems.push({
            ...item,
            product_name: prod ? prod.name : 'Unknown Product',
            cost_price: prod ? prod.cost_price : 0,
            category: cat
          });
        }

        // Get Customer
        const cust = tx.customer_id ? await db.customers.get(tx.customer_id) : null;

        enhancedTxs.push({
          ...tx,
          cashier_name: c.cashier_name,
          customer_name: cust ? cust.name : 'Pelanggan Umum',
          items: enhancedItems
        });
      }

      // 4. Process Expenses & Drawer Cash
      let unclosedExpense = 0;
      const expense = exps.reduce((sum, e) => {
         const amt = Number(e.amount) || 0;
         if (new Date(e.created_at).getTime() > (lastClosed['Semua'] || 0)) {
            unclosedExpense += amt;
         }
         return sum + amt;
      }, 0);
      const cashOut = expense;
      const unclosedCashOut = unclosedExpense;

      // Cash in Drawer = Starting Cash (approximate to 0 for MVP) + Cash In - Cash Out - Cash Refund
      // We will read the latest opened cash session if any
      let startingCash = 0;
      for (let i = cashSessions.length - 1; i >= 0; i--) {
        if (!cashSessions[i].closed_category || cashSessions[i].closed_category === 'Semua' || cashSessions[i].notes === 'Buka Kas (Manual)') {
          startingCash = Number(cashSessions[i].starting_cash) || 0;
          break;
        }
      }
      
      // Kas di Laci = Physical Cash ONLY (CASH in, CASH out). QRIS and Transfer go to bank.
      const drawerCash = startingCash + cashIn - cashOut - cashRefund;
      const unclosedDrawerCash = startingCash + unclosedCashIn - unclosedCashOut - unclosedCashRefund;

      const grossProfit = income - costTotal;
      const netProfit = grossProfit - expense;
      
      const unclosedGrossProfit = unclosedIncome - unclosedCostTotal;
      const unclosedNetProfit = unclosedGrossProfit - unclosedExpense;
      
      const unclosedNetProfitByCategory = {};
      Object.keys(unclosedParentIncomeByCategory).forEach(cat => {
         const rev = unclosedParentIncomeByCategory[cat] || 0;
         const cost = unclosedParentCostByCategory[cat] || 0;
         unclosedNetProfitByCategory[cat] = rev - cost;
      });
      
      // Top Product & Method
      const topMethod = Object.keys(methodCounts).sort((a,b) => methodCounts[b] - methodCounts[a])[0] || '-';
      const topProduct = Object.keys(productCounts).sort((a,b) => productCounts[b] - productCounts[a])[0] || '-';

      // Cashier Analysis Array
      const cashierAnalysis = Object.values(cashierMap).map(c => ({
        ...c,
        avg_tx: c.total_tx > 0 ? c.total_sales / c.total_tx : 0
      })).sort((a,b) => b.total_sales - a.total_sales);

      // 5. Build Chart Data (Dynamic Grouping based on dateFilter)
      const chartMap = {};
      
      const getChartKey = (dateStr) => {
        const date = new Date(dateStr);
        if (period === 'today' || period === 'yesterday') {
          return {
            key: date.getHours().toString().padStart(2, '0') + ':00',
            sortKey: date.getHours()
          };
        } else if (period === 'all_time') {
          return {
            key: date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
            sortKey: date.getFullYear() * 100 + date.getMonth()
          };
        } else {
          // this_week, this_month, custom
          const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          return {
            key: date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
            sortKey: startOfDay.getTime()
          };
        }
      };

      enhancedTxs.filter(t => t.status === 'COMPLETED').forEach(t => {
        const { key, sortKey } = getChartKey(t.created_at);
        if (!chartMap[key]) chartMap[key] = { date: key, sortKey, income: 0, profit: 0, expense: 0 };
        chartMap[key].income += t.total_amount;
        // Approximation of profit per tx for chart: total - (cost for this tx)
        const cost = t.items.reduce((sum, item) => sum + ((item.cost_price || 0) * item.qty), 0);
        chartMap[key].profit += (t.total_amount - cost);
      });
      exps.forEach(e => {
        const { key, sortKey } = getChartKey(e.created_at);
        if (!chartMap[key]) chartMap[key] = { date: key, sortKey, income: 0, profit: 0, expense: 0 };
        chartMap[key].expense += (e.amount || 0);
        chartMap[key].profit -= (e.amount || 0);
      });

      const chartData = Object.values(chartMap).sort((a,b) => a.sortKey - b.sortKey);

      const finalLastClosedByTime = { ...lastClosedByTime };
      if (lastClosedByTime['Semua']) {
        Object.keys(incomeByCategory).forEach(c => {
          if (!finalLastClosedByTime[c] || new Date(lastClosedByTime['Semua']).getTime() > new Date(finalLastClosedByTime[c]).getTime()) {
            finalLastClosedByTime[c] = lastClosedByTime['Semua'];
          }
        });
      }

      return {
        periodLabel,
        summary: {
          income,
          incomeByCategory,
          parentIncomeByCategory,
          unclosedParentIncomeByCategory,
          unclosedParentCostByCategory,
          lastClosedByTime: finalLastClosedByTime,
          expense,
          grossProfit,
          netProfit,
          unclosedNetProfit,
          unclosedNetProfitByCategory,
          totalTx: txs.filter(t=>t.status==='COMPLETED').length,
          avgTx: txs.length ? income / txs.length : 0,
          totalItems,
          totalItemsSayur,
          topProduct,
          topMethod,
          drawerCash: unclosedDrawerCash
        },
        recap: {
          startingCash,
          cashIn: unclosedCashIn,
          qrisIn: unclosedQrisIn,
          transferIn: unclosedTransferIn,
          cashOut: unclosedCashOut,
          cashRefund: unclosedCashRefund,
          drawerCash: unclosedDrawerCash
        },
        transactions: enhancedTxs,
        expenses: exps,
        cashSessions: cashSessions,
        cashierAnalysis,
        chartData,
        warehouseLogs: { auditLogs, restocks },
        allProducts,
        productCounts
      };

    } catch (error) {
      console.error('Failed to load reports:', error);
      return null;
    }
  }, [period, customStartDate, customEndDate]);

  // Loading is true while data is undefined
  return { 
    data: data || {
      periodLabel: '',
      summary: { income: 0, incomeByCategory: {}, unclosedIncomeByCategory: {}, lastClosedByTime: {}, expense: 0, grossProfit: 0, netProfit: 0, totalTx: 0, avgTx: 0, totalItems: 0, totalItemsSayur: 0, topProduct: '-', topMethod: '-', drawerCash: 0 },
      recap: { startingCash: 0, cashIn: 0, qrisIn: 0, transferIn: 0, cashOut: 0, cashRefund: 0, drawerCash: 0 },
      transactions: [],
      expenses: [],
      cashSessions: [],
      cashierAnalysis: [],
      chartData: [],
      warehouseLogs: { auditLogs: [], restocks: [] },
      allProducts: [],
      productCounts: {}
    }, 
    loading: data === undefined
  };
}
