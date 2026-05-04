import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Badge, Text, Button, Select, Input, HStack, useToast, FormControl, FormLabel
} from '@chakra-ui/react';

interface FacultyMember {
  _id: string; name: string; programPosition: string;
  currentStatus: string; currentLocation?: string; room: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return 'green'; case 'IN_CLASS': return 'blue';
    case 'IN_MEETING': return 'yellow'; case 'ON_BREAK': return 'orange';
    case 'OUT_OF_OFFICE': return 'gray'; default: return 'gray';
  }
};

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  
  const userRole = localStorage.getItem('userRole');
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');

  const [myStatus, setMyStatus] = useState('');
  const [myLocation, setMyLocation] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // === NEW: STATE FOR MY SCHEDULE ===
  const [mySchedule, setMySchedule] = useState<any[]>([]);
  const hasSyncedRef = useRef(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const fetchStatus = () => {
    fetch('http://localhost:5000/api/faculty/status')
      .then((res) => res.json())
      .then((data) => {
        setFaculty(data);
        if (userId && data.length > 0 && !hasSyncedRef.current) {
          const me = data.find((f: FacultyMember) => f._id === userId);
          if (me) { 
            setMyStatus(me.currentStatus);
            setMyLocation(me.currentLocation || me.room || '');
            hasSyncedRef.current = true;
          }
        }
      })
      .catch((error) => console.error("Error fetching data:", error));
  };

  // === NEW: FETCH SCHEDULE FROM BACKEND ===
  const fetchMySchedule = () => {
    if (userId) {
      fetch(`http://localhost:5000/api/faculty/my-schedule/${userId}`)
        .then(res => res.json())
        .then(data => setMySchedule(data))
        .catch(err => console.error("Error fetching schedule:", err));
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchMySchedule(); // Fetch the schedule when page loads
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
        fetchStatus(); 
      }
    } catch (error) {}
    setIsUpdating(false);
  };

  // Helper for schedule table
  const getDayName = (dayNum: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum] || 'Unknown';
  };

  return (
    <Box p={8} maxW="1200px" mx="auto" bg="#f7fafc" minH="100vh">
      <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" mb={6} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Heading size="lg" mb={1}>Personnel Availability Board</Heading>
          <Text color="gray.500">{userRole === 'FACULTY' ? `Welcome back, ${userName}` : 'Live status tracking for faculty members.'}</Text>
        </Box>
        <Button onClick={handleLogout} colorScheme="red" variant="outline">Logout</Button>
      </Box>

      {userRole === 'FACULTY' && (
        <Box bg="blue.50" p={6} borderRadius="xl" borderWidth="1px" borderColor="blue.100" mb={6}>
          <Heading size="sm" color="blue.800" mb={4}>Update Your Live Status</Heading>
          <HStack spacing={4} alignItems="flex-end">
            <FormControl flex="1">
              <FormLabel fontSize="sm" color="blue.800">Current Status</FormLabel>
              <Select bg="white" value={myStatus} onChange={(e) => setMyStatus(e.target.value)}>
                <option value="AVAILABLE">Available</option>
                <option value="IN_CLASS">In Class</option>
                <option value="IN_MEETING">In a Meeting</option>
                <option value="ON_BREAK">On Break</option>
                <option value="OUT_OF_OFFICE">Out of Office</option>
              </Select>
            </FormControl>
            <FormControl flex="1">
              <FormLabel fontSize="sm" color="blue.800">Location</FormLabel>
              <Input bg="white" value={myLocation} onChange={(e) => setMyLocation(e.target.value)} />
            </FormControl>
            <Button colorScheme="blue" onClick={handleUpdateMyStatus} isLoading={isUpdating} px={8}>Update</Button>
          </HStack>
        </Box>
      )}

      {/* === NEW: INSTRUCTOR SCHEDULE TABLE === */}
      {userRole === 'FACULTY' && mySchedule.length > 0 && (
        <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" mb={6} borderWidth="1px">
          <Heading size="md" color="#5E766C" mb={4}>Your Assigned Class Schedule</Heading>
          <TableContainer>
            <Table size="sm" variant="simple">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Day</Th><Th>Time</Th><Th>Subject</Th><Th>Room</Th>
                </Tr>
              </Thead>
              <Tbody>
                {mySchedule.map((sched, index) => (
                  <Tr key={index}>
                    <Td fontWeight="bold">{getDayName(sched.dayOfWeek)}</Td>
                    <Td>{sched.startTime} - {sched.endTime}</Td>
                    <Td>{sched.subject}</Td>
                    <Td>{sched.room}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Public Board */}
      <TableContainer bg="white" borderRadius="xl" boxShadow="sm" borderWidth="1px">
        <Table variant="simple">
          <Thead bg="gray.50"><Tr><Th>Faculty Name</Th><Th>Program / Position</Th><Th>Live Status</Th><Th>Location</Th></Tr></Thead>
          <Tbody>
            {faculty.map((prof) => (
              <Tr key={prof._id} bg={prof._id === userId ? "yellow.50" : "transparent"}>
                <Td fontWeight="bold">{prof.name} {prof._id === userId && <Badge ml={2} colorScheme="yellow">YOU</Badge>}</Td>
                <Td>{prof.programPosition}</Td>
                <Td><Badge colorScheme={getStatusColor(prof.currentStatus)} px={3} py={1} borderRadius="full">{prof.currentStatus.replace(/_/g, ' ')}</Badge></Td>
                <Td>{prof.currentLocation || prof.room || 'N/A'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}