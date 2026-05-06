import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Badge, Text, Button, Select, Input, HStack, useToast, FormControl, FormLabel, Flex, VStack, Divider, Textarea
} from '@chakra-ui/react';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return 'green'; case 'IN_CLASS': return 'blue';
    case 'IN_MEETING': return 'yellow'; case 'ON_BREAK': return 'orange';
    case 'OUT_OF_OFFICE': return 'gray'; case 'ON_LEAVE': return 'purple'; case 'ABSENT': return 'red';
    default: return 'gray';
  }
};

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  
  const userRole = localStorage.getItem('userRole');
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');

  // Sidebar State
  const [activeView, setActiveView] = useState('status');

  // Data States
  const [myStatus, setMyStatus] = useState('');
  const [myLocation, setMyLocation] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [mySchedule, setMySchedule] = useState<any[]>([]);
  const hasSyncedRef = useRef(false);

  // Prototype Form States
  const [notice, setNotice] = useState('');
  const [flagDate, setFlagDate] = useState('');

  const handleLogout = () => { localStorage.clear(); navigate('/'); };

  const fetchStatus = () => {
    fetch('http://localhost:5000/api/faculty/status')
      .then((res) => res.json())
      .then((data) => {
        if (userId && data.length > 0 && !hasSyncedRef.current) {
          const me = data.find((f: any) => f._id === userId);
          if (me) { 
            setMyStatus(me.currentStatus);
            setMyLocation(me.currentLocation || me.room || '');
            hasSyncedRef.current = true;
          }
        }
      });
  };

  const fetchMySchedule = () => {
    if (userId) {
      fetch(`http://localhost:5000/api/faculty/my-schedule/${userId}`)
        .then(res => res.json())
        .then(data => setMySchedule(data));
    }
  };

  useEffect(() => {
    fetchStatus(); fetchMySchedule();
    const intervalId = setInterval(fetchStatus, 5000);
    return () => clearInterval(intervalId);
  }, [userId]);

  const handleUpdateMyStatus = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`http://localhost:5000/api/faculty/update-status/${userId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStatus: myStatus, currentLocation: myLocation })
      });
      if (response.ok) {
        toast({ title: 'Status updated!', status: 'success', duration: 2000 });
        setNotice(''); // clear notice on success
      }
    } catch (error) {}
    setIsUpdating(false);
  };

  const handlePrototypeSubmit = (e: React.FormEvent, title: string) => {
    e.preventDefault();
    toast({ title: title, description: "Phase 2 Backend Integration Required", status: "info" });
  };

  const getDayName = (dayNum: number) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayNum] || 'Unknown';

  const renderSidebar = () => (
    <Box w="250px" bg="#5E766C" color="white" p={6} display="flex" flexDir="column" h="100vh" position="sticky" top="0">
      <Heading size="md" mb={8}>Faculty Portal</Heading>
      <VStack align="stretch" spacing={2} flex="1">
        <Button justifyContent="flex-start" variant={activeView === 'status' ? 'solid' : 'ghost'} colorScheme={activeView === 'status' ? 'green' : 'whiteAlpha'} onClick={() => setActiveView('status')}>My Status</Button>
        <Button justifyContent="flex-start" variant={activeView === 'schedule' ? 'solid' : 'ghost'} colorScheme={activeView === 'schedule' ? 'green' : 'whiteAlpha'} onClick={() => setActiveView('schedule')}>My Schedule</Button>
        <Button justifyContent="flex-start" variant={activeView === 'attendance' ? 'solid' : 'ghost'} colorScheme={activeView === 'attendance' ? 'green' : 'whiteAlpha'} onClick={() => setActiveView('attendance')}>Update History</Button>
      </VStack>
      <Button mt="auto" colorScheme="red" onClick={handleLogout}>Logout</Button>
    </Box>
  );

  return (
    <Flex minH="100vh" bg="#f7fafc">
      {renderSidebar()}

      <Box flex="1" p={8} overflowY="auto">
        <Box mb={8}>
          <Heading size="lg" color="gray.800">
            {activeView === 'status' && "Live Status & Notices"}
            {activeView === 'schedule' && "Teaching Schedule & Future Flags"}
            {activeView === 'attendance' && "Personal Update History"}
          </Heading>
          <Text color="gray.500">Welcome back, {userName}</Text>
        </Box>

        {/* --- VIEW: STATUS --- */}
        {activeView === 'status' && (
          <Box display="flex" gap={6} flexDir={{ base: 'column', md: 'row' }}>
            <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" flex="1">
              <Heading size="md" color="#5E766C" mb={4}>Update Live Status</Heading>
              <VStack spacing={4} alignItems="flex-start">
                <FormControl>
                  <FormLabel>Current Status</FormLabel>
                  <Select value={myStatus} onChange={(e) => setMyStatus(e.target.value)}>
                    <option value="AVAILABLE">Available</option>
                    <option value="IN_CLASS">In Class</option>
                    <option value="IN_MEETING">In a Meeting</option>
                    <option value="ON_BREAK">On Break</option>
                    <option value="OUT_OF_OFFICE">Out of Office</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="ABSENT">Absent</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Location</FormLabel>
                  <Input value={myLocation} onChange={(e) => setMyLocation(e.target.value)} />
                </FormControl>
                <Button colorScheme="green" bg="#5E766C" onClick={handleUpdateMyStatus} isLoading={isUpdating} w="100%">Publish Status</Button>
              </VStack>
            </Box>

            <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" flex="1">
              <Heading size="md" color="orange.500" mb={4}>Post a Notice (Students)</Heading>
              <form onSubmit={(e) => handlePrototypeSubmit(e, "Notice Posted")}>
                <VStack spacing={4}>
                  <FormControl>
                    <FormLabel>Reason for absence / Make-up info</FormLabel>
                    <Textarea placeholder="e.g. Attending a seminar today. Make up class on Friday." value={notice} onChange={e => setNotice(e.target.value)} rows={4} />
                  </FormControl>
                  <Button type="submit" colorScheme="orange" variant="outline" w="100%">Broadcast Notice</Button>
                </VStack>
              </form>
            </Box>
          </Box>
        )}

        {/* --- VIEW: SCHEDULE --- */}
        {activeView === 'schedule' && (
          <Box display="flex" gap={6} flexDir="column">
            <Box bg="white" p={6} borderRadius="xl" boxShadow="sm">
              <Heading size="md" color="#5E766C" mb={4}>Assigned Blocks</Heading>
              <TableContainer border="1px solid" borderColor="gray.200" borderRadius="md">
                <Table size="sm" variant="simple">
                  <Thead bg="#5E766C">
                    <Tr>
                      <Th color="white" borderRight="1px solid white">Day</Th>
                      <Th color="white" borderRight="1px solid white">Time</Th>
                      <Th color="white" borderRight="1px solid white">Subject</Th>
                      <Th color="white">Room</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {mySchedule.map((sched, index) => (
                      <Tr key={index}>
                        <Td fontWeight="bold" borderRight="1px solid" borderColor="gray.200">{getDayName(sched.dayOfWeek)}</Td>
                        <Td borderRight="1px solid" borderColor="gray.200">{sched.startTime} - {sched.endTime}</Td>
                        <Td borderRight="1px solid" borderColor="gray.200">{sched.subject}</Td>
                        <Td>{sched.room}</Td>
                      </Tr>
                    ))}
                    {mySchedule.length === 0 && <Tr><Td colSpan={4} textAlign="center" py={4}>No schedule assigned.</Td></Tr>}
                  </Tbody>
                </Table>
              </TableContainer>
            </Box>

            <Box bg="red.50" p={6} borderRadius="xl" boxShadow="sm" border="1px solid" borderColor="red.200">
              <Heading size="md" color="red.600" mb={4}>Flag Future Unavailability</Heading>
              <form onSubmit={(e) => handlePrototypeSubmit(e, "Dates Flagged")}>
                <HStack spacing={4} alignItems="flex-end">
                  <FormControl><FormLabel>Date</FormLabel><Input type="date" bg="white" value={flagDate} onChange={e => setFlagDate(e.target.value)} /></FormControl>
                  <FormControl><FormLabel>Reason</FormLabel><Input placeholder="e.g. Approved Leave" bg="white" /></FormControl>
                  <Button type="submit" colorScheme="red" px={8}>Flag Date</Button>
                </HStack>
              </form>
            </Box>
          </Box>
        )}

        {/* --- VIEW: ATTENDANCE HISTORY --- */}
        {activeView === 'attendance' && (
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm">
             <Text mb={4} color="gray.500"><em>Note: Below is simulated prototype data for the logging feature.</em></Text>
             <TableContainer>
              <Table variant="simple" size="sm">
                <Thead bg="gray.50"><Tr><Th>Timestamp</Th><Th>Previous Status</Th><Th>New Status</Th><Th>Location</Th></Tr></Thead>
                <Tbody>
                  <Tr><Td>{new Date().toLocaleString()}</Td><Td><Badge>AVAILABLE</Badge></Td><Td><Badge colorScheme="blue">IN CLASS</Badge></Td><Td>IICT 305</Td></Tr>
                  <Tr><Td>Yesterday, 08:00 AM</Td><Td><Badge>OUT OF OFFICE</Badge></Td><Td><Badge colorScheme="green">AVAILABLE</Badge></Td><Td>Faculty Room</Td></Tr>
                  <Tr><Td>Monday, 04:30 PM</Td><Td><Badge>IN CLASS</Badge></Td><Td><Badge colorScheme="gray">OUT OF OFFICE</Badge></Td><Td>N/A</Td></Tr>
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>
    </Flex>
  );
}