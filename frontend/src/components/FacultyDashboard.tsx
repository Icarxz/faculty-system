import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Badge, Text, Button, Select, Input, HStack, useToast, FormControl, FormLabel, Flex, VStack, Textarea,
  useColorMode, useColorModeValue
} from '@chakra-ui/react';

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { colorMode, toggleColorMode } = useColorMode();
  
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');

  const [activeView, setActiveView] = useState('status');
  const [myStatus, setMyStatus] = useState('');
  const [myLocation, setMyLocation] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [mySchedule, setMySchedule] = useState<any[]>([]);
  const [myAppointments, setMyAppointments] = useState<any[]>([]); // NEW STATE
  const hasSyncedRef = useRef(false);
  
  const [notice, setNotice] = useState('');
  const [flagDate, setFlagDate] = useState('');
  const [flagReason, setFlagReason] = useState('');

  // Universal Theme Hooks
  const mainBg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.900', 'white');
  const mutedText = useColorModeValue('gray.500', 'gray.400');
  const sidebarBg = useColorModeValue('black', 'gray.900');

  const fetchData = () => {
    // Fetch Status
    fetch('http://localhost:5000/api/faculty/status')
      .then((res) => res.json())
      .then((data) => {
        if (userId && data.length > 0 && !hasSyncedRef.current) {
          const me = data.find((f: any) => f._id === userId);
          if (me) { 
            setMyStatus(me.currentStatus);
            setMyLocation(me.currentLocation || me.room || '');
            setNotice(me.noticeMessage || '');
            hasSyncedRef.current = true;
          }
        }
      });
      
    // Fetch Appointments
    if (userId) {
      fetch(`http://localhost:5000/api/faculty/appointments/me/${userId}`)
        .then(res => res.json())
        .then(data => setMyAppointments(data));
        
      fetch(`http://localhost:5000/api/faculty/my-schedule/${userId}`)
        .then(res => res.json())
        .then(data => setMySchedule(data));
    }
  };

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 5000);
    return () => clearInterval(intervalId);
  }, [userId]);

  // --- ACTIONS ---
  const handleUpdateMyStatus = async () => {
    setIsUpdating(true);
    try {
      await fetch(`http://localhost:5000/api/faculty/update-status/${userId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStatus: myStatus, currentLocation: myLocation })
      });
      toast({ title: 'Status updated!', status: 'success', duration: 2000 });
    } catch (error) {}
    setIsUpdating(false);
  };

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`http://localhost:5000/api/faculty/notice/${userId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notice })
      });
      toast({ title: 'Notice Broadcasted to Students!', status: 'success' });
    } catch (error) {}
  };

  const handleFlagDate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`http://localhost:5000/api/faculty/flag-date/${userId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagDate, reason: flagReason })
      });
      toast({ title: 'Future absence flagged!', status: 'success' });
    } catch (error) {}
  };

  // --- SMART APPROVAL ENGINE ---
  const updateAppointmentStatus = async (targetApt: any, newStatus: string) => {
    // Only run the smart checks if they are trying to APPROVE an appointment
    if (newStatus === 'APPROVED') {
      
      // Filter the faculty's list to ONLY look at already APPROVED appointments on the SAME date
      const approvedThatDay = myAppointments.filter(
        a => a.status === 'APPROVED' && a.date === targetApt.date
      );

      // Helper function to convert "HH:MM" string to total minutes for easy math
      const timeToMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return (hours * 60) + minutes;
      };

      const targetMinutes = timeToMinutes(targetApt.time);

      for (let existingApt of approvedThatDay) {
        const existingMinutes = timeToMinutes(existingApt.time);
        const timeDifference = Math.abs(targetMinutes - existingMinutes);

        // 1. HARD BLOCK: Exact Overlap (0 minutes apart)
        if (timeDifference === 0) {
          toast({ 
            title: "Overlap Blocked", 
            description: `You already have an appointment with ${existingApt.studentName} at this exact time!`, 
            status: "error", 
            duration: 5000 
          });
          return; // Instantly stops the function. Does NOT send to backend.
        }

        // 2. WARNING: Proximity (60 minutes or less apart)
        if (timeDifference <= 60) {
          const isConfirmed = window.confirm(
            `WARNING: This appointment is only ${timeDifference} minutes away from your approved meeting with ${existingApt.studentName} at ${existingApt.time}. \n\nDo you want to proceed and accept a back-to-back schedule?`
          );
          
          if (!isConfirmed) {
            return; // If they click "Cancel" on the popup, stop the function.
          }
        }
      }
    }

    // If it passes the checks (or if it's a Rejection), proceed with the API call
    try {
      const response = await fetch(`http://localhost:5000/api/faculty/appointment/${targetApt._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        toast({ title: `Appointment ${newStatus}`, status: 'success' });
        fetchData(); // refresh list
      }
    } catch (error) {}
  };

  const getDayName = (dayNum: number) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayNum] || 'Unknown';

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    // Normalize common separators
    const normalized = timeStr.replace(/-/g, ':');
    const parts = normalized.split(':');
    if (parts.length < 2) return normalized;
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1].padStart(2, '0');
    if (Number.isNaN(hours)) return normalized;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const renderSidebar = () => (
    <Box w="260px" bg={sidebarBg} color="white" p={6} display="flex" flexDir="column" h="100vh" position="sticky" top="0" borderRightWidth="1px" borderColor={borderColor}>
      <Heading size="md" mb={8} color="white" letterSpacing="tight">Faculty Portal</Heading>
      <VStack align="stretch" spacing={2} flex="1">
        <Button justifyContent="flex-start" variant={activeView === 'status' ? 'solid' : 'ghost'} colorScheme={activeView === 'status' ? 'blue' : 'whiteAlpha'} color={activeView === 'status' ? 'white' : 'gray.300'} onClick={() => setActiveView('status')}>My Status</Button>
        <Button justifyContent="flex-start" variant={activeView === 'schedule' ? 'solid' : 'ghost'} colorScheme={activeView === 'schedule' ? 'blue' : 'whiteAlpha'} color={activeView === 'schedule' ? 'white' : 'gray.300'} onClick={() => setActiveView('schedule')}>My Schedule</Button>
        <Button justifyContent="flex-start" variant={activeView === 'appointments' ? 'solid' : 'ghost'} colorScheme={activeView === 'appointments' ? 'blue' : 'whiteAlpha'} color={activeView === 'appointments' ? 'white' : 'gray.300'} onClick={() => setActiveView('appointments')}>Appointments ({myAppointments.filter(a => a.status === 'PENDING').length})</Button>
      </VStack>
      <VStack spacing={4} mt="auto">
        <Button w="100%" variant="outline" color="gray.300" borderColor="gray.600" _hover={{ color: 'white', borderColor: 'gray.400' }} onClick={toggleColorMode}>{colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}</Button>
        <Button w="100%" colorScheme="red" variant="solid" onClick={() => { localStorage.clear(); navigate('/'); }}>Logout</Button>
      </VStack>
    </Box>
  );

  return (
    <Flex minH="100vh" bg={mainBg}>
      {renderSidebar()}
      <Box flex="1" p={10} overflowY="auto">
        <Box mb={8}>
          <Heading size="lg" color={textColor} letterSpacing="tight">
            {activeView === 'status' && "Live Status & Notices"}
            {activeView === 'schedule' && "Teaching Schedule & Future Flags"}
            {activeView === 'appointments' && "My Appointments"}
          </Heading>
          <Text color={mutedText} mt={1}>Welcome back, {userName}</Text>
        </Box>

        {activeView === 'status' && (
          <Box display="flex" gap={6} flexDir={{ base: 'column', md: 'row' }}>
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm" flex="1">
              <Heading size="md" color={textColor} mb={6}>Update Live Status</Heading>
              <VStack spacing={4} alignItems="flex-start">
                <FormControl><FormLabel color={textColor}>Current Status</FormLabel>
                  <Select value={myStatus} onChange={(e) => setMyStatus(e.target.value)} color={textColor}>
                    <option value="AVAILABLE">Available</option><option value="IN_CLASS">In Class</option>
                    <option value="IN_MEETING">In a Meeting</option><option value="ON_BREAK">On Break</option>
                    <option value="OUT_OF_OFFICE">Out of Office</option><option value="ON_LEAVE">On Leave</option><option value="ABSENT">Absent</option>
                  </Select>
                </FormControl>
                <FormControl><FormLabel color={textColor}>Location</FormLabel><Input value={myLocation} onChange={(e) => setMyLocation(e.target.value)} color={textColor} /></FormControl>
                <Button colorScheme="blue" onClick={handleUpdateMyStatus} isLoading={isUpdating} w="100%">Publish Status</Button>
              </VStack>
            </Box>
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm" flex="1">
              <Heading size="md" color={textColor} mb={6}>Post a Notice (Students)</Heading>
              <form onSubmit={handlePostNotice}>
                <VStack spacing={4}>
                  <FormControl><FormLabel color={textColor}>Reason for absence / Make-up info</FormLabel>
                    <Textarea placeholder="e.g. Attending a seminar today. Make up class on Friday." value={notice} onChange={e => setNotice(e.target.value)} rows={4} color={textColor} />
                  </FormControl>
                  <Button type="submit" colorScheme="blue" variant="outline" w="100%">Broadcast Notice</Button>
                </VStack>
              </form>
            </Box>
          </Box>
        )}

        {activeView === 'schedule' && (
          <Box display="flex" gap={6} flexDir="column">
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm">
              <Heading size="md" color={textColor} mb={6}>Assigned Blocks</Heading>
              <TableContainer><Table size="sm" variant="simple">
                <Thead><Tr><Th color={mutedText}>Day</Th><Th color={mutedText}>Time</Th><Th color={mutedText}>Subject</Th><Th color={mutedText}>Room</Th></Tr></Thead>
                <Tbody>
                  {mySchedule.map((sched, index) => (
                    <Tr key={index}><Td fontWeight="bold" color={textColor}>{getDayName(sched.dayOfWeek)}</Td><Td color={textColor}>{sched.startTime} - {sched.endTime}</Td><Td color={textColor}>{sched.subject}</Td><Td color={textColor}>{sched.room}</Td></Tr>
                  ))}
                  {mySchedule.length === 0 && <Tr><Td colSpan={4} textAlign="center" py={4} color={mutedText}>No schedule assigned.</Td></Tr>}
                </Tbody>
              </Table></TableContainer>
            </Box>
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm">
              <Heading size="md" color="red.500" mb={6}>Flag Future Unavailability</Heading>
              <form onSubmit={handleFlagDate}>
                <HStack spacing={4} alignItems="flex-end">
                  <FormControl><FormLabel color={textColor}>Date</FormLabel><Input type="date" value={flagDate} onChange={e => setFlagDate(e.target.value)} color={textColor} /></FormControl>
                  <FormControl><FormLabel color={textColor}>Reason</FormLabel><Input value={flagReason} onChange={e => setFlagReason(e.target.value)} placeholder="e.g. Approved Leave" color={textColor} /></FormControl>
                  <Button type="submit" colorScheme="red" px={8}>Flag Date</Button>
                </HStack>
              </form>
            </Box>
          </Box>
        )}

        {activeView === 'appointments' && (
          <Box display="flex" flexDir="column" gap={6}>
            
            {/* GOOGLE CALENDAR VIEW */}
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm" h="500px">
              <Heading size="md" color={textColor} mb={4}>My Calendar Overview</Heading>
              <Calendar
                localizer={localizer}
                events={myAppointments
                  .filter(apt => apt.status === 'APPROVED') // ONLY show approved ones on the calendar!
                  .map(apt => {
                    // Convert the "YYYY-MM-DD" and a time like "HH:MM" or "HH-MM" into Date objects
                    const [yStr, mStr, dStr] = (apt.date || '').split('-');
                    const year = parseInt(yStr, 10) || 0;
                    const month = parseInt(mStr, 10) || 1;
                    const day = parseInt(dStr, 10) || 1;

                    const normalizedTime = (apt.time || '').replace(/-/g, ':');
                    const tParts = normalizedTime.split(':');
                    const hour = parseInt(tParts[0] || '0', 10) || 0;
                    const minute = parseInt(tParts[1] || '0', 10) || 0;

                    const startDate = new Date(year, month - 1, day, hour, minute);
                    const endDate = new Date(startDate.getTime() + 60 * 60000); // Assumes meetings are 1 hour long

                    return {
                      title: `Meeting: ${apt.studentName}`,
                      start: startDate,
                      end: endDate,
                    };
                  })}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%', color: colorMode === 'light' ? 'black' : 'white' }}
                views={['month', 'week', 'day']}
                defaultView="week"
              />
            </Box>

            {/* PENDING REQUESTS TABLE */}
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm">
               <Heading size="md" color={textColor} mb={4}>Pending Requests & History</Heading>
               <Table variant="simple" size="sm">
                <Thead><Tr><Th color={mutedText}>Student</Th><Th color={mutedText}>Date/Time</Th><Th color={mutedText}>Reason</Th><Th color={mutedText}>Status</Th><Th color={mutedText}>Action</Th></Tr></Thead>
                <Tbody>
                  {myAppointments.map(apt => (
                    <Tr key={apt._id}>
                      <Td fontWeight="bold" color={textColor}>{apt.studentName} ({apt.studentSection})</Td>
                      <Td color={textColor}>{apt.date} {formatTime(apt.time)}</Td>
                      <Td maxW="200px" isTruncated color={textColor}>{apt.reason}</Td>
                      <Td><Badge colorScheme={apt.status === 'APPROVED' ? 'green' : apt.status === 'REJECTED' ? 'red' : apt.status === 'PENDING' ? 'yellow' : 'gray'}>{apt.status}</Badge></Td>
                      <Td>
                        {apt.status === 'PENDING' && (
                          <HStack spacing={2}>
                            {/* Updated to pass the full 'apt' object into our Smart Engine */}
                            <Button size="xs" colorScheme="green" onClick={() => updateAppointmentStatus(apt, 'APPROVED')}>Approve</Button>
                            <Button size="xs" colorScheme="red" onClick={() => updateAppointmentStatus(apt, 'REJECTED')}>Reject</Button>
                          </HStack>
                        )}
                      </Td>
                    </Tr>
                  ))}
                  {myAppointments.length === 0 && <Tr><Td colSpan={5} textAlign="center" py={4} color={mutedText}>No appointments requested.</Td></Tr>}
                </Tbody>
              </Table>
            </Box>
          </Box>
        )}
      </Box>
    </Flex>
  );
}