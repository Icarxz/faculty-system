import React, { useState, useEffect } from 'react';
import { 
  Box, Heading, Text, Button, VStack, Input, FormControl, FormLabel, 
  useToast, Select, HStack, Flex, Divider, Table, Thead, Tbody, Tr, Th, Td, Badge, IconButton
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const userName = localStorage.getItem('userName');

  // Sidebar Navigation State
  const [activeView, setActiveView] = useState('home');

  // Global Data States
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Add Faculty Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [programPosition, setProgramPosition] = useState('');
  const [room, setRoom] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedQr, setGeneratedQr] = useState('');
  const [newFacultyName, setNewFacultyName] = useState('');

  // Assign Schedule Form State
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [subject, setSubject] = useState('');
  const [schedRoom, setSchedRoom] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('1'); 
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // --- DATA FETCHING ---
  const fetchAllData = () => {
    fetch('http://localhost:5000/api/faculty/status').then(res => res.json()).then(data => setFacultyList(data));
    fetch('http://localhost:5000/api/faculty/appointments/all').then(res => res.json()).then(data => setAppointments(data));
    fetch('http://localhost:5000/api/faculty/users/all').then(res => res.json()).then(data => setAllUsers(data));
  };

  useEffect(() => { fetchAllData(); }, []);

  const handleLogout = () => { localStorage.clear(); navigate('/'); };

  // --- FORM HANDLERS ---
  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setGeneratedQr('');
    try {
      const response = await fetch('http://localhost:5000/api/faculty/add', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, programPosition, room })
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: data.message, status: 'success' });
        setGeneratedQr(data.qrHash); setNewFacultyName(data.facultyName);
        setName(''); setEmail(''); setProgramPosition(''); setRoom('');
        fetchAllData();
      } else { toast({ title: data.error, status: 'error' }); }
    } catch (error) { }
    setLoading(false);
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/faculty/schedule/add', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facultyId: selectedFacultyId, subject, room: schedRoom, dayOfWeek: Number(dayOfWeek), startTime, endTime })
      });
      if (response.ok) {
        toast({ title: 'Schedule Added Successfully!', status: 'success' });
        setSubject(''); setSchedRoom(''); setStartTime(''); setEndTime('');
      }
    } catch (err) { toast({ title: 'Error adding schedule', status: 'error' }); }
  };

  const updateAppointmentStatus = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/faculty/appointment/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        toast({ title: `Appointment ${newStatus}`, status: 'success' });
        fetchAllData();
      }
    } catch (error) {}
  };

  // --- RENDER HELPERS ---
  const renderSidebar = () => (
    <Box w="250px" bg="gray.900" color="white" p={6} display="flex" flexDir="column" h="100vh" position="sticky" top="0">
      <Heading size="md" mb={8} color="red.400">CCIS Admin</Heading>
      <VStack align="stretch" spacing={2} flex="1">
        <Button justifyContent="flex-start" variant={activeView === 'home' ? 'solid' : 'ghost'} colorScheme={activeView === 'home' ? 'red' : 'gray'} onClick={() => setActiveView('home')}>Home / Provisioning</Button>
        <Button justifyContent="flex-start" variant={activeView === 'faculty' ? 'solid' : 'ghost'} colorScheme={activeView === 'faculty' ? 'red' : 'gray'} onClick={() => setActiveView('faculty')}>Faculty Management</Button>
        <Button justifyContent="flex-start" variant={activeView === 'appointments' ? 'solid' : 'ghost'} colorScheme={activeView === 'appointments' ? 'red' : 'gray'} onClick={() => setActiveView('appointments')}>Appointments ({appointments.filter(a => a.status === 'PENDING').length})</Button>
        <Button justifyContent="flex-start" variant={activeView === 'verification' ? 'solid' : 'ghost'} colorScheme={activeView === 'verification' ? 'red' : 'gray'} onClick={() => setActiveView('verification')}>Account Verification</Button>
      </VStack>
      <Button mt="auto" colorScheme="red" variant="outline" onClick={handleLogout}>Logout</Button>
    </Box>
  );

  return (
    <Flex minH="100vh" bg="#f7fafc">
      {renderSidebar()}

      <Box flex="1" p={8} overflowY="auto">
        <Box mb={8}>
          <Heading size="lg" color="gray.800">
            {activeView === 'home' && "System Provisioning"}
            {activeView === 'faculty' && "Faculty Roster & Live Status"}
            {activeView === 'appointments' && "Appointment Management"}
            {activeView === 'verification' && "Account Verification Queue"}
          </Heading>
          <Text color="gray.500">Welcome back, {userName}</Text>
        </Box>

        {/* --- VIEW: HOME (Provisioning & Setup) --- */}
        {activeView === 'home' && (
          <Box display="flex" gap={8} flexDir={{ base: 'column', xl: 'row' }}>
            <Box flex="1" display="flex" flexDir="column" gap={6}>
              <Box bg="white" p={6} borderRadius="xl" boxShadow="sm">
                <Heading size="md" mb={4}>1. Provision Faculty Account</Heading>
                <form onSubmit={handleAddFaculty}>
                  <VStack spacing={4}>
                    <FormControl isRequired><FormLabel>Full Name</FormLabel><Input value={name} onChange={(e) => setName(e.target.value)} /></FormControl>
                    <HStack w="100%">
                      <FormControl isRequired><FormLabel>Email</FormLabel><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></FormControl>
                      <FormControl isRequired><FormLabel>Room</FormLabel><Input value={room} onChange={(e) => setRoom(e.target.value)} /></FormControl>
                    </HStack>
                    <FormControl isRequired><FormLabel>Program & Position</FormLabel><Input value={programPosition} onChange={(e) => setProgramPosition(e.target.value)} /></FormControl>
                    <Button type="submit" colorScheme="red" w="100%" isLoading={loading}>Generate Account & QR</Button>
                  </VStack>
                </form>
              </Box>

              <Box bg="white" p={6} borderRadius="xl" boxShadow="sm">
                <Heading size="md" mb={4}>2. Assign Teaching Schedule</Heading>
                <form onSubmit={handleAddSchedule}>
                  <VStack spacing={4}>
                    <HStack w="100%">
                      <FormControl isRequired><FormLabel>Instructor</FormLabel><Select placeholder="Choose..." value={selectedFacultyId} onChange={(e) => setSelectedFacultyId(e.target.value)}>{facultyList.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}</Select></FormControl>
                      <FormControl isRequired><FormLabel>Subject</FormLabel><Input value={subject} onChange={e => setSubject(e.target.value)} /></FormControl>
                    </HStack>
                    <HStack w="100%">
                      <FormControl isRequired><FormLabel>Day</FormLabel><Select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option></Select></FormControl>
                      <FormControl isRequired><FormLabel>Room</FormLabel><Input value={schedRoom} onChange={e => setSchedRoom(e.target.value)} /></FormControl>
                    </HStack>
                    <HStack w="100%">
                      <FormControl isRequired><FormLabel>Start</FormLabel><Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></FormControl>
                      <FormControl isRequired><FormLabel>End</FormLabel><Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></FormControl>
                    </HStack>
                    <Button type="submit" colorScheme="gray" w="100%">Assign Class Block</Button>
                  </VStack>
                </form>
              </Box>
            </Box>

            <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" flex="1" minH="400px" display="flex" flexDir="column" alignItems="center" justifyContent="center">
              {generatedQr ? (
                <VStack spacing={4}>
                  <Heading size="md" color="green.500">Provisioning Complete</Heading>
                  <Text textAlign="center">Scan to authenticate:<br/><b>{newFacultyName}</b></Text>
                  <Box p={4} bg="white" borderWidth="2px" borderRadius="lg"><QRCodeSVG value={generatedQr} size={200} /></Box>
                  <Button size="sm" variant="outline" onClick={() => window.print()}>Print Hardware Key (QR)</Button>
                </VStack>
              ) : (
                <Text color="gray.400" textAlign="center">Fill provisioning form to generate authentication token.</Text>
              )}
            </Box>
          </Box>
        )}

        {/* --- VIEW: FACULTY MANAGEMENT --- */}
        {activeView === 'faculty' && (
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm">
            <Table variant="simple" size="sm">
              <Thead bg="gray.50"><Tr><Th>Name</Th><Th>Position</Th><Th>Live Status</Th><Th>Location Override</Th></Tr></Thead>
              <Tbody>
                {facultyList.map(prof => (
                  <Tr key={prof._id}>
                    <Td fontWeight="bold">{prof.name}</Td>
                    <Td>{prof.programPosition}</Td>
                    <Td><Badge colorScheme={prof.currentStatus === 'AVAILABLE' ? 'green' : 'gray'}>{prof.currentStatus}</Badge></Td>
                    <Td>{prof.currentLocation || prof.room}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {/* --- VIEW: APPOINTMENTS --- */}
        {activeView === 'appointments' && (
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm">
            <Table variant="simple" size="sm">
              <Thead bg="gray.50"><Tr><Th>Student</Th><Th>Target Faculty</Th><Th>Date/Time</Th><Th>Reason</Th><Th>Status</Th><Th>Action</Th></Tr></Thead>
              <Tbody>
                {appointments.map(apt => (
                  <Tr key={apt._id}>
                    <Td fontWeight="bold">{apt.studentName} ({apt.studentSection})</Td>
                    <Td>{apt.facultyId ? apt.facultyId.name : 'Unknown'}</Td>
                    <Td>{apt.date} @ {apt.time}</Td>
                    <Td maxW="200px" isTruncated>{apt.reason}</Td>
                    <Td><Badge colorScheme={apt.status === 'APPROVED' ? 'green' : apt.status === 'REJECTED' ? 'red' : 'yellow'}>{apt.status}</Badge></Td>
                    <Td>
                      {apt.status === 'PENDING' && (
                        <HStack spacing={2}>
                          <Button size="xs" colorScheme="green" onClick={() => updateAppointmentStatus(apt._id, 'APPROVED')}>Approve</Button>
                          <Button size="xs" colorScheme="red" onClick={() => updateAppointmentStatus(apt._id, 'REJECTED')}>Reject</Button>
                        </HStack>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {/* --- VIEW: ACCOUNT VERIFICATION --- */}
        {activeView === 'verification' && (
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm">
             <Text mb={4} color="gray.600">
               <em>Note for Panel:</em> This queue displays accounts awaiting institutional verification. Currently, provisioning is handled manually by the Admin (meaning accounts bypass the pending state). When self-registration is integrated in the next phase, pending accounts will populate here for approval.
             </Text>
             <Divider mb={4} />
            <Table variant="simple" size="sm">
              <Thead bg="gray.50"><Tr><Th>Name</Th><Th>Email</Th><Th>Requested Role</Th><Th>System Status</Th><Th>Action</Th></Tr></Thead>
              <Tbody>
                {allUsers.map(user => (
                  <Tr key={user._id}>
                    <Td fontWeight="bold">{user.name}</Td>
                    <Td>{user.email}</Td>
                    <Td><Badge colorScheme="blue">{user.role}</Badge></Td>
                    <Td><Badge colorScheme="green">VERIFIED (Auto-Provisioned)</Badge></Td>
                    <Td><Button size="xs" isDisabled>Revoke Access</Button></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

      </Box>
    </Flex>
  );
}