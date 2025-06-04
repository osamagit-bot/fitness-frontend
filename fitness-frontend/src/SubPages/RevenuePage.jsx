import { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar as ChartJSBar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  ChartLegend
);

// Colors for different charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function RevenuePage() {
    const [members, setMembers] = useState([]);
    const [revenueData, setRevenueData] = useState({
        daily: 0,
        monthly: 0,
        annual: 0,
        outstanding: 0
    });
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Date selection
    const currentDate = new Date();
    const [selectedDate, setSelectedDate] = useState(currentDate);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), // First day of current month
        endDate: currentDate
    });
    const [dateRangeType, setDateRangeType] = useState('daily'); // 'daily', 'weekly', 'monthly', 'custom'
    const [dailyRevenueAmount, setDailyRevenueAmount] = useState(0);
    const [rangeRevenueAmount, setRangeRevenueAmount] = useState(0);
    
    // Monthly data for charts
    const [monthlyData, setMonthlyData] = useState([]);
    // Membership type breakdown
    const [membershipTypeData, setMembershipTypeData] = useState([]);
    // Revenue comparison
    const [comparisonData, setComparisonData] = useState({
        current: 0,
        previous: 0,
        percentChange: 0
    });
    
    // Format currency
    const formatAfn = (amount) => {
        return `${amount.toFixed(2)} AFN`;
    };

    // Load data on component mount
    useEffect(() => {
        fetchMembers();
    }, []);
    
    // Update revenue when date changes
    useEffect(() => {
        if (members.length > 0) {
            calculateDailyRevenue(selectedDate);
        }
    }, [selectedDate, members]);
    
    // Update revenue when date range changes
    useEffect(() => {
        if (members.length > 0) {
            calculateRangeRevenue(dateRange.startDate, dateRange.endDate);
            calculateComparisonData(dateRange.startDate, dateRange.endDate);
        }
    }, [dateRange, members]);
    
    // Helper function to check if a date matches the selectedDate
    const isDateMatching = (date1, date2) => {
        if (!date1 || !date2) return false;
        
        // Format both dates to YYYY-MM-DD for string comparison
        const formatDate = (date) => {
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };
        
        let dateStr1, dateStr2;
        
        try {
            dateStr1 = typeof date1 === 'string' ? formatDate(date1) : formatDate(date1);
            dateStr2 = typeof date2 === 'string' ? formatDate(date2) : formatDate(date2);
            return dateStr1 === dateStr2;
        } catch (error) {
            console.error("Date formatting error:", error);
            return false;
        }
    };
    
    // Check if a date is within range
    const isDateInRange = (date, startDate, endDate) => {
        if (!date) return false;
        
        const checkDate = new Date(date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Clear time portion for accurate comparison
        checkDate.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        
        return checkDate >= start && checkDate <= end;
    };
    
    // Get members for the selected date - used for both display and revenue
    const getMembersForSelectedDate = () => {
        const todayString = new Date().toISOString().split('T')[0];
        const selectedDateString = selectedDate.toISOString().split('T')[0];
        const isSelectedDateToday = selectedDateString === todayString;
        
        // For today's date, we need special handling to catch new registrations
        if (isSelectedDateToday) {
            return members.filter(member => {
                // Check all possible date fields
                if (member.join_date && isDateMatching(member.join_date, selectedDateString)) {
                    return true;
                }
                if (member.start_date && isDateMatching(member.start_date, selectedDateString)) {
                    return true;
                }
                if (member.created_at && isDateMatching(member.created_at, selectedDateString)) {
                    return true;
                }
                if (member.updated_at && isDateMatching(member.updated_at, selectedDateString)) {
                    return true;
                }
                
                // Check if this could be a recently added member with no dates
                if (!member.join_date && !member.start_date && !member.created_at && !member.updated_at) {
                    // For members with no dates at all, assume they were just added today
                    // This helps with recently registered members
                    return true;
                }
                
                return false;
            });
        } else {
            // For past dates, use join_date or start_date
            return members.filter(member => {
                return (member.join_date && isDateMatching(member.join_date, selectedDateString)) || 
                       (member.start_date && isDateMatching(member.start_date, selectedDateString));
            });
        }
    };
    
    // Get members for a date range
    const getMembersForDateRange = (startDate, endDate) => {
        return members.filter(member => {
            // Check if join date or start date is within range
            const joinDateInRange = member.join_date && isDateInRange(member.join_date, startDate, endDate);
            const startDateInRange = member.start_date && isDateInRange(member.start_date, startDate, endDate);
            
            return joinDateInRange || startDateInRange;
        });
    };
    
    // Fetch member data
    const fetchMembers = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://127.0.0.1:8000/api/members/');
            
            // Process response data
            const memberList = Array.isArray(response.data) ? response.data : 
                               (response.data.results || []);
            
            console.log('Fetched members:', memberList);
            
            setMembers(memberList);
            
            if (memberList.length > 0) {
                calculateRevenue(memberList);
                generateMonthlyData(memberList);
                calculateDailyRevenue(selectedDate);
                calculateRangeRevenue(dateRange.startDate, dateRange.endDate);
                generateMembershipTypeData(memberList);
                calculateComparisonData(dateRange.startDate, dateRange.endDate);
            }
            
            setError(null);
        } catch (err) {
            console.error('Error fetching members:', err);
            setError('Failed to load member data');
        } finally {
            setLoading(false);
        }
    };
    
    // Calculate revenue from members
    const calculateRevenue = (memberList) => {
        // Calculate monthly revenue from all members' fees
        let monthlyRevenue = 0;
        
        memberList.forEach(member => {
            if (member?.monthly_fee) {
                const fee = parseFloat(member.monthly_fee);
                if (!isNaN(fee)) {
                    monthlyRevenue += fee;
                }
            }
        });
        
        // Calculate daily (monthly ÷ days in month)
        const daysInMonth = new Date(currentDate.getFullYear(), 
                                   currentDate.getMonth() + 1, 0).getDate();
        const dailyRevenue = monthlyRevenue / daysInMonth;
        
        // Set revenue data
        setRevenueData({
            daily: dailyRevenue,
            monthly: monthlyRevenue,
            annual: monthlyRevenue * 12,
            outstanding: monthlyRevenue * 0.1 // Assuming 10% outstanding
        });
    };
    
    // Calculate revenue for a specific date
    const calculateDailyRevenue = (date) => {
        if (!date) return;
        
        const dateString = date.toISOString().split('T')[0];
        setSelectedDate(date);
        
        // Store current selectedDate in state
        const selectedDateObj = new Date(dateString);
        
        // Get members for revenue calculation
        const membersForRevenue = getMembersForSelectedDate();
        
        // Calculate revenue from the filtered members
        let dailyRevenue = 0;
        membersForRevenue.forEach(member => {
            if (member?.monthly_fee) {
                const fee = parseFloat(member.monthly_fee);
                if (!isNaN(fee)) {
                    dailyRevenue += fee;
                }
            }
        });
        
        // Apply weekend modifier
        const isWeekend = selectedDateObj.getDay() === 0 || selectedDateObj.getDay() === 6;
        if (isWeekend) {
            dailyRevenue *= 1.2; // 20% more revenue on weekends
        }
        
        setDailyRevenueAmount(dailyRevenue);
    };
    
    // Calculate revenue for a date range
    const calculateRangeRevenue = (startDate, endDate) => {
        if (!startDate || !endDate) return;
        
        // Get members for revenue calculation
        const membersInRange = getMembersForDateRange(startDate, endDate);
        
        // Calculate revenue from the filtered members
        let rangeRevenue = 0;
        membersInRange.forEach(member => {
            if (member?.monthly_fee) {
                const fee = parseFloat(member.monthly_fee);
                if (!isNaN(fee)) {
                    rangeRevenue += fee;
                }
            }
        });
        
        setRangeRevenueAmount(rangeRevenue);
    };
    
    // Calculate comparison data (current period vs previous period)
    const calculateComparisonData = (startDate, endDate) => {
        if (!startDate || !endDate) return;
        
        // Calculate current period revenue
        const membersInCurrentRange = getMembersForDateRange(startDate, endDate);
        let currentRevenue = 0;
        membersInCurrentRange.forEach(member => {
            if (member?.monthly_fee) {
                const fee = parseFloat(member.monthly_fee);
                if (!isNaN(fee)) {
                    currentRevenue += fee;
                }
            }
        });
        
        // Calculate previous period (same duration, immediately before)
        const currentStart = new Date(startDate);
        const currentEnd = new Date(endDate);
        const duration = currentEnd.getTime() - currentStart.getTime();
        
        const previousEnd = new Date(currentStart);
        previousEnd.setDate(previousEnd.getDate() - 1);
        
        const previousStart = new Date(previousEnd);
        previousStart.setTime(previousEnd.getTime() - duration);
        
        // Get members for previous period
        const membersInPreviousRange = getMembersForDateRange(previousStart, previousEnd);
        let previousRevenue = 0;
        membersInPreviousRange.forEach(member => {
            if (member?.monthly_fee) {
                const fee = parseFloat(member.monthly_fee);
                if (!isNaN(fee)) {
                    previousRevenue += fee;
                }
            }
        });
        
        // Calculate percent change
        let percentChange = 0;
        if (previousRevenue > 0) {
            percentChange = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
        }
        
        setComparisonData({
            current: currentRevenue,
            previous: previousRevenue,
            percentChange: percentChange
        });
    };
    
    // Generate monthly data for charts based on join dates
    const generateMonthlyData = (memberList) => {
        const months = [];
        
        // Generate data for last 6 months
        for (let i = 0; i < 6; i++) {
            const date = new Date(currentDate);
            date.setMonth(date.getMonth() - i);
            
            // Set to first day of month
            const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            // Set to last day of month
            const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            
            const monthName = date.toLocaleString('default', { month: 'short' });
            
            // Calculate membership revenue for this month (members who joined this month)
            let memberRevenue = 0;
            
            memberList.forEach(member => {
                const joinDate = member.join_date ? new Date(member.join_date) : 
                                (member.start_date ? new Date(member.start_date) : null);
                
                if (!joinDate) return;
                
                // Check if the join date is within this month
                if (joinDate >= firstDayOfMonth && joinDate <= lastDayOfMonth) {
                    if (member?.monthly_fee) {
                        const fee = parseFloat(member.monthly_fee);
                        if (!isNaN(fee)) {
                            memberRevenue += fee;
                        }
                    }
                }
            });
            
            // Add to months array
            months.unshift({
                name: monthName,
                revenue: memberRevenue,
                date: new Date(date.getFullYear(), date.getMonth(), 1)
            });
        }
        
        setMonthlyData(months);
    };
    
    // Generate data for membership type breakdown
    const generateMembershipTypeData = (memberList) => {
        // Get unique membership types
        const membershipTypes = {};
        
        memberList.forEach(member => {
            const type = member.membership_type || 'Unknown';
            if (!membershipTypes[type]) {
                membershipTypes[type] = {
                    name: type,
                    value: 0,
                    count: 0
                };
            }
            
            if (member?.monthly_fee) {
                const fee = parseFloat(member.monthly_fee);
                if (!isNaN(fee)) {
                    membershipTypes[type].value += fee;
                }
            }
            
            membershipTypes[type].count += 1;
        });
        
        // Convert to array for chart
        const typeData = Object.values(membershipTypes);
        setMembershipTypeData(typeData);
    };
    
    // Handle date range change
    const handleDateRangeChange = (type) => {
        const today = new Date();
        let startDate = new Date();
        let endDate = new Date(today);
        
        switch (type) {
            case 'daily':
                // Current day
                startDate = new Date(today);
                break;
                
            case 'weekly':
                // Last 7 days
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 6);
                break;
                
            case 'monthly':
                // Current month
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
                
            case 'quarterly':
                // Last 3 months
                startDate = new Date(today);
                startDate.setMonth(today.getMonth() - 2, 1);
                break;
                
            default:
                // Don't change dates for custom
                return;
        }
        
        setDateRangeType(type);
        setDateRange({
            startDate: startDate,
            endDate: endDate
        });
    };
    
    // Handle custom start date change
    const handleStartDateChange = (date) => {
        setDateRangeType('custom');
        setDateRange(prev => ({
            ...prev,
            startDate: date
        }));
    };
    
    // Handle custom end date change
    const handleEndDateChange = (date) => {
        setDateRangeType('custom');
        setDateRange(prev => ({
            ...prev,
            endDate: date
        }));
    };
    
    // Handle specific date selection
    const handleDateSelect = (date) => {
        setSelectedDate(date);
    };
    
    // Handle previous day
    const goToPreviousDay = () => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() - 1);
        setSelectedDate(date);
    };
    
    // Handle next day
    const goToNextDay = () => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + 1);
        
        // Don't go into the future
        if (date <= new Date()) {
            setSelectedDate(date);
        }
    };
    
    // Refresh data
    const handleRefresh = () => {
        fetchMembers();
    };
    
    // Chart configuration for monthly data
    const chartData = {
        labels: monthlyData.map(month => month.name),
        datasets: [
            {
                label: 'Monthly Revenue',
                data: monthlyData.map(month => month.revenue),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgb(54, 162, 235)',
                borderWidth: 1
            }
        ]
    };
    
    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Monthly Revenue'
            }
        }
    };
    
    // Format date for display
    const formatDate = (dateObject) => {
        const date = new Date(dateObject);
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };
    
    // Check if selected date is weekend
    const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
    
    // Format date for inputs
    const formatDateForInput = (date) => {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    };
    
    // Get members for the current selected date
    const membersOnSelectedDate = getMembersForSelectedDate();
    
    // Export to CSV function
    const exportToCSV = () => {
        // Prepare data
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Add headers
        csvContent += "Revenue Report - " + formatDate(selectedDate) + "\r\n\r\n";
        
        // Add summary
        csvContent += "Revenue Summary\r\n";
        csvContent += "Daily Revenue:," + formatAfn(dailyRevenueAmount) + "\r\n";
        csvContent += "Monthly Revenue:," + formatAfn(revenueData.monthly) + "\r\n";
        csvContent += "Annual Revenue (Est.):," + formatAfn(revenueData.annual) + "\r\n";
        csvContent += "Outstanding Payments:," + formatAfn(revenueData.outstanding) + "\r\n\r\n";
        
        // Add date range revenue
        csvContent += `Revenue (${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)}):,${formatAfn(rangeRevenueAmount)}\r\n\r\n`;
        
        // Add members if any
        if (membersOnSelectedDate.length > 0) {
            csvContent += "Members Registered on this Date\r\n";
            csvContent += "Name,Membership Type,Fee\r\n";
            
            membersOnSelectedDate.forEach(member => {
                const memberName = member.name || `${member.first_name || ''} ${member.last_name || ''}` || 'Unknown';
                const membershipType = member.membership_type || 'Standard';
                const fee = member.monthly_fee ? `${member.monthly_fee} AFN` : 'N/A';
                
                csvContent += `${memberName},${membershipType},${fee}\r\n`;
            });
        } else {
            csvContent += "No members registered on this date.\r\n";
        }
        
        // Add monthly data
        csvContent += "\r\nMonthly Revenue Trend\r\n";
        csvContent += "Month,Revenue\r\n";
        
        monthlyData.forEach(month => {
            csvContent += `${month.name},${month.revenue}\r\n`;
        });
        
        // Add membership type breakdown
        csvContent += "\r\nRevenue by Membership Type\r\n";
        csvContent += "Type,Revenue,Member Count\r\n";
        
        membershipTypeData.forEach(type => {
            csvContent += `${type.name},${type.value},${type.count}\r\n`;
        });
        
        // Create download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Revenue_Report_${formatDateForInput(selectedDate)}.csv`);
        document.body.appendChild(link);
        
        // Download CSV
        link.click();
        document.body.removeChild(link);
    };
    
    // Simplified HTML report export (no PDF library dependency)
    const exportReport = () => {
        // Create a new window for the report
        const reportWindow = window.open('', '_blank');
        
        // Create the report content with styling
        const reportContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Revenue Report - ${formatDate(selectedDate)}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        color: #333;
                    }
                    .report-header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .report-title {
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .report-date {
                        font-size: 16px;
                        color: #666;
                        margin-bottom: 5px;
                    }
                    .report-generated {
                        font-size: 12px;
                        color: #999;
                    }
                    .section {
                        margin-bottom: 30px;
                    }
                    .section-title {
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 15px;
                        border-bottom: 1px solid #ddd;
                        padding-bottom: 5px;
                    }
                    .summary-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 15px;
                        margin-bottom: 20px;
                    }
                    .summary-item {
                        background-color: #f9f9f9;
                        padding: 15px;
                        border-radius: 5px;
                    }
                    .summary-label {
                        font-size: 14px;
                        color: #666;
                        margin-bottom: 5px;
                    }
                    .summary-value {
                        font-size: 18px;
                        font-weight: bold;
                        color: #2563eb;
                    }
                    .comparison {
                        display: flex;
                        justify-content: space-between;
                        background-color: #f0f9ff;
                        padding: 15px;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                    .comparison-item {
                        text-align: center;
                    }
                    .comparison-label {
                        font-size: 14px;
                        color: #666;
                    }
                    .comparison-value {
                        font-size: 18px;
                        font-weight: bold;
                    }
                    .comparison-change {
                        font-weight: bold;
                    }
                    .comparison-up {
                        color: #10b981;
                    }
                    .comparison-down {
                        color: #ef4444;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 8px 12px;
                        text-align: left;
                    }
                    th {
                        background-color: #f2f2f2;
                        font-weight: bold;
                    }
                    tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                    .signature-section {
                        margin-top: 50px;
                        display: flex;
                        justify-content: space-between;
                    }
                    .signature-box {
                        width: 200px;
                    }
                    .signature-line {
                        border-top: 1px solid #333;
                        margin-top: 50px;
                        padding-top: 5px;
                        font-size: 14px;
                    }
                    .footer {
                        margin-top: 50px;
                        text-align: center;
                        font-size: 12px;
                        color: #999;
                        border-top: 1px solid #ddd;
                        padding-top: 10px;
                    }
                    @media print {
                        body {
                            margin: 0.5in;
                        }
                        button {
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="report-header">
                    <div class="report-title">Revenue Report</div>
                    <div class="report-date">${formatDate(selectedDate)}</div>
                    <div class="report-generated">Generated on: ${new Date().toLocaleString()}</div>
                </div>
                
                <div class="section">
                    <div class="section-title">Revenue Summary</div>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <div class="summary-label">Daily Revenue</div>
                            <div class="summary-value">${formatAfn(dailyRevenueAmount)}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">New Members</div>
                            <div class="summary-value">${membersOnSelectedDate.length}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">Monthly Revenue</div>
                            <div class="summary-value">${formatAfn(revenueData.monthly)}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">Annual Revenue (Est.)</div>
                            <div class="summary-value">${formatAfn(revenueData.annual)}</div>
                        </div>
                    </div>
                    
                    <div class="section-title">Date Range Revenue</div>
                    <div class="summary-item">
                        <div class="summary-label">${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)}</div>
                        <div class="summary-value">${formatAfn(rangeRevenueAmount)}</div>
                    </div>
                    
                    <div class="comparison">
                        <div class="comparison-item">
                            <div class="comparison-label">Current Period</div>
                            <div class="comparison-value">${formatAfn(comparisonData.current)}</div>
                        </div>
                        <div class="comparison-item">
                            <div class="comparison-label">Previous Period</div>
                            <div class="comparison-value">${formatAfn(comparisonData.previous)}</div>
                        </div>
                        <div class="comparison-item">
                            <div class="comparison-label">Change</div>
                            <div class="comparison-value comparison-${comparisonData.percentChange >= 0 ? 'up' : 'down'}">
                                ${comparisonData.percentChange >= 0 ? '+' : ''}${comparisonData.percentChange.toFixed(2)}%
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">Members Registered on ${formatDate(selectedDate)}</div>
                    ${membersOnSelectedDate.length > 0 ? `
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Membership Type</th>
                                    <th>Fee</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${membersOnSelectedDate.map(member => `
                                    <tr>
                                        <td>${member.name || `${member.first_name || ''} ${member.last_name || ''}` || 'Unknown'}</td>
                                        <td>${member.membership_type || 'Standard'}</td>
                                        <td>${member.monthly_fee ? `${member.monthly_fee} AFN` : 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : `<p>No members registered on this date.</p>`}
                </div>
                
                <div class="signature-section">
                    <div class="signature-box">
                        <div class="signature-line">Prepared by</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line">Approved by</div>
                    </div>
                </div>
                
                <div class="footer">
                    <p>This is an automatically generated report.</p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <button onclick="window.print()" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Print Report
                    </button>
                </div>
            </body>
            </html>
        `;
        
        // Write content to the new window
        reportWindow.document.open();
        reportWindow.document.write(reportContent);
        reportWindow.document.close();
    };
    
    return (
        <div className="p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Revenue Dashboard</h1>
                <div className="flex gap-2">
                    <button 
                        onClick={handleRefresh}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-300"
                        disabled={loading}
                    >
                        {loading ? 'Refreshing...' : 'Refresh Data'}
                    </button>
                    
                    <div className="relative inline-block">
                        <button 
                            className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-600 transition-colors duration-300"
                            onClick={() => document.getElementById('exportDropdown').classList.toggle('hidden')}
                        >
                            Export/Print
                        </button>
                        <div 
                            id="exportDropdown" 
                            className="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
                        >
                            <button 
                                onClick={() => window.print()}
                                className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
                            >
                                Print Page
                            </button>
                            <button 
                                onClick={exportReport}
                                className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
                            >
                                Export Report
                            </button>
                            <button 
                                onClick={exportToCSV}
                                className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
                            >
                                Export as CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            {error && <div className="bg-red-100 text-red-700 p-4 mb-6 rounded-lg">{error}</div>}
            
            {/* Date Range Selection */}
            <div className="bg-white p-5 rounded-xl shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4">Revenue Time Period</h2>
                
                <div className="flex flex-wrap gap-2 mb-4">
                    <button 
                        className={`px-4 py-2 rounded ${dateRangeType === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                        onClick={() => handleDateRangeChange('daily')}
                    >
                        Today
                    </button>
                    <button 
                        className={`px-4 py-2 rounded ${dateRangeType === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                        onClick={() => handleDateRangeChange('weekly')}
                    >
                        Last 7 Days
                    </button>
                    <button 
                        className={`px-4 py-2 rounded ${dateRangeType === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                        onClick={() => handleDateRangeChange('monthly')}
                    >
                        This Month
                    </button>
                    <button 
                        className={`px-4 py-2 rounded ${dateRangeType === 'quarterly' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                        onClick={() => handleDateRangeChange('quarterly')}
                    >
                        Last 3 Months
                    </button>
                    <button 
                        className={`px-4 py-2 rounded ${dateRangeType === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                        onClick={() => setDateRangeType('custom')}
                    >
                        Custom Range
                    </button>
                </div>
                
                {dateRangeType === 'custom' && (
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                            <input 
                                type="date" 
                                value={formatDateForInput(dateRange.startDate)}
                                onChange={(e) => handleStartDateChange(new Date(e.target.value))}
                                max={formatDateForInput(new Date())}
                                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">End Date</label>
                            <input 
                                type="date" 
                                value={formatDateForInput(dateRange.endDate)}
                                onChange={(e) => handleEndDateChange(new Date(e.target.value))}
                                max={formatDateForInput(new Date())}
                                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Revenue in Selected Period</h4>
                        <p className="text-2xl font-bold text-blue-600">{formatAfn(rangeRevenueAmount)}</p>
                        <p className="text-xs text-gray-500 mt-1">
                            {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
                        </p>
                    </div>
                    
                    <div className={`p-4 rounded-lg ${comparisonData.percentChange >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Compared to Previous Period</h4>
                        <div className="flex items-baseline">
                            <p className={`text-2xl font-bold ${comparisonData.percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {comparisonData.percentChange >= 0 ? '+' : ''}{comparisonData.percentChange.toFixed(2)}%
                            </p>
                            <p className="text-sm text-gray-500 ml-2">
                                ({formatAfn(comparisonData.previous)})
                            </p>
                        </div>
                    </div>
                    
                    <div className="bg-indigo-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Average Daily Revenue</h4>
                        <p className="text-2xl font-bold text-indigo-600">
                            {formatAfn(rangeRevenueAmount / ((dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24) + 1))}
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Revenue Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-5 rounded-xl shadow-md">
                    <h3 className="text-gray-500 text-sm font-medium mb-2">Daily Revenue (Avg)</h3>
                    <p className="text-2xl font-bold text-gray-800">{formatAfn(revenueData.daily)}</p>
                </div>
                
                <div className="bg-white p-5 rounded-xl shadow-md">
                    <h3 className="text-gray-500 text-sm font-medium mb-2">Monthly Revenue</h3>
                    <p className="text-2xl font-bold text-gray-800">{formatAfn(revenueData.monthly)}</p>
                </div>
                
                <div className="bg-white p-5 rounded-xl shadow-md">
                    <h3 className="text-gray-500 text-sm font-medium mb-2">Annual Revenue (Est.)</h3>
                    <p className="text-2xl font-bold text-gray-800">{formatAfn(revenueData.annual)}</p>
                </div>
                
                <div className="bg-white p-5 rounded-xl shadow-md">
                    <h3 className="text-gray-500 text-sm font-medium mb-2">Outstanding Payments</h3>
                    <p className="text-2xl font-bold text-gray-800">{formatAfn(revenueData.outstanding)}</p>
                </div>
            </div>
            
            {/* Daily Revenue Section */}
            <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Daily Revenue</h2>
                    
                    <div className="flex items-center">
                        <button 
                            onClick={goToPreviousDay}
                            className="p-2 bg-gray-200 rounded-l-lg hover:bg-gray-300 transition-colors"
                        >
                            &larr;
                        </button>
                        
                        <DatePicker
                            selected={selectedDate}
                            onChange={handleDateSelect}
                            maxDate={new Date()}
                            dateFormat="yyyy-MM-dd"
                            className="border-gray-200 border-y px-3 py-2 focus:outline-none w-32 text-center"
                        />
                        
                        <button 
                            onClick={goToNextDay}
                            className="p-2 bg-gray-200 rounded-r-lg hover:bg-gray-300 transition-colors"
                            disabled={selectedDate >= new Date()}
                        >
                            &rarr;
                        </button>
                    </div>
                </div>
                
                <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                        {formatDate(selectedDate)}
                        {isWeekend && <span className="ml-2 text-sm font-normal text-blue-500">(Weekend rates applied)</span>}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-500 mb-1">Revenue</h4>
                            <p className="text-2xl font-bold text-blue-600">{formatAfn(dailyRevenueAmount)}</p>
                        </div>
                        
                        <div className="bg-green-50 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-500 mb-1">New Members</h4>
                            <p className="text-2xl font-bold text-green-600">{membersOnSelectedDate.length}</p>
                        </div>
                    </div>
                </div>
                
                {membersOnSelectedDate.length > 0 ? (
                    <div>
                        <h3 className="text-lg font-medium text-gray-700 mb-3">Members Registered on this Date</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membership Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {membersOnSelectedDate.map(member => (
                                        <tr key={member.id || member.athlete_id || Math.random().toString()}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {member.name || `${member.first_name || ''} ${member.last_name || ''}` || 'Unknown'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.membership_type || 'Standard'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.monthly_fee ? `${member.monthly_fee} AFN` : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6 text-gray-500">No members registered on this date.</div>
                )}
            </div>
            
            {/* Revenue Data Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Monthly Revenue Trend */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Monthly Revenue Trend</h2>
                    
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={monthlyData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value) => `${value.toFixed(2)} AFN`} />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    name="Revenue"
                                    stroke="#3b82f6"
                                    activeDot={{ r: 8 }}
                                    strokeWidth={2}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                {/* Revenue by Membership Type */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Revenue by Membership Type</h2>
                    
                    <div className="h-80 flex flex-col items-center">
                        <ResponsiveContainer width="100%" height="80%">
                            <PieChart>
                                <Pie
                                    data={membershipTypeData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {membershipTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${value.toFixed(2)} AFN`} />
                            </PieChart>
                        </ResponsiveContainer>
                        
                        <div className="mt-4 grid grid-cols-2 gap-4 w-full">
                            {membershipTypeData.map((type, index) => (
                                <div key={index} className="flex items-center">
                                    <div 
                                        className="w-3 h-3 rounded-full mr-2" 
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    ></div>
                                    <span className="text-sm">{type.name} ({type.count} members)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RevenuePage;
