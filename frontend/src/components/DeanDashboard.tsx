import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Button, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Badge, Input, SimpleGrid, Stat, StatLabel, StatNumber, HStack, Flex, VStack, 
  CircularProgress, CircularProgressLabel, Divider, useColorMode, useColorModeValue,
  FormControl, FormLabel
} from '@chakra-ui/react';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return 'green'; case 'IN_CLASS': return 'blue';
    case 'IN_MEETING': return 'yellow'; case 'ON_BREAK': return 'orange';
    case 'OUT_OF_OFFICE': return 'gray'; case 'ON_LEAVE': return 'purple'; case 'ABSENT': return 'red';
    default: return 'gray';
  }
};

export default function DeanDashboard() {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName');
  const { colorMode, toggleColorMode } = useColorMode();
  
  const [activeView, setActiveView] = useState('analytics');
  const [faculty, setFaculty] = useState<any[]>([]);

  // The true, legal useMemo hook placed correctly at the top of the component
  const stats = useMemo(() => {
    const total    = faculty.length;
    const present  = faculty.filter(f => ['AVAILABLE', 'IN_CLASS', 'IN_MEETING', 'ON_BREAK'].includes(f.currentStatus)).length;
    const absent   = faculty.filter(f => ['ABSENT', 'ON_LEAVE'].includes(f.currentStatus)).length;
    const noUpdate = faculty.filter(f => !f.currentStatus || f.currentStatus === 'NOT_UPDATED').length;
    const compliance = total > 0 ? Math.round(((total - noUpdate) / total) * 100) : 0;

    return { total, present, absent, noUpdate, compliance };
  }, [faculty]);

  // Universal Theme Hooks
  const mainBg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.900', 'white');
  const mutedText = useColorModeValue('gray.500', 'gray.400');
  const sidebarBg = useColorModeValue('black', 'gray.900');

  const fetchStatus = () => {
    fetch('http://localhost:5000/api/faculty/status')
      .then((res) => res.json())
      .then((data) => setFaculty(data));
  };

  useEffect(() => {
    fetchStatus();
    const intervalId = setInterval(fetchStatus, 30000); // Poll every 30 seconds
    return () => clearInterval(intervalId);
  }, []);

  const totalFaculty = faculty.length;
  const availableCount = faculty.filter(f => f.currentStatus === 'AVAILABLE').length;
  const inClassCount = faculty.filter(f => f.currentStatus === 'IN_CLASS').length;
  const absentCount = faculty.filter(f => f.currentStatus === 'ABSENT' || f.currentStatus === 'ON_LEAVE').length;
  const flaggedFaculty = faculty.filter(f => f.currentStatus === 'ABSENT' || f.currentStatus === 'ON_LEAVE' || f.currentStatus === 'OUT_OF_OFFICE');

  const generateReport = () => {
    let csvContent = "data:text/csv;charset=utf-8,Faculty Name,Program / Position,Live Status,Current Location\n";
    faculty.forEach(prof => {
      const name = prof.name.replace(/,/g, ''); 
      const program = prof.programPosition.replace(/,/g, '');
      const status = prof.currentStatus.replace(/_/g, ' ');
      const location = (prof.currentLocation || prof.room || 'N/A').replace(/,/g, '');
      csvContent += `${name},${program},${status},${location}\n`;
    });
    csvContent += `\nANALYTICS SUMMARY\nTotal Personnel,${totalFaculty}\nCurrently Available,${availableCount}\nIn Classrooms,${inClassCount}\nAbsent/On Leave,${absentCount}\nGenerated On,${new Date().toLocaleString()}\n`;
    
    // REMOVED the duplicate illegal hook from here!

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Dean_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click(); document.body.removeChild(link);
  };

  const renderSidebar = () => (
    <Box w="260px" bg={sidebarBg} color="white" p={6} display="flex" flexDir="column" h="100vh" position="sticky" top="0" borderRightWidth="1px" borderColor={borderColor}>
      <Heading size="md" mb={8} color="white" letterSpacing="tight">Dean's Office</Heading>
      <VStack align="stretch" spacing={2} flex="1">
        <Button 
          justifyContent="flex-start" 
          variant={activeView === 'analytics' ? 'solid' : 'ghost'} 
          colorScheme={activeView === 'analytics' ? 'blue' : 'whiteAlpha'} 
          color={activeView === 'analytics' ? 'white' : 'gray.300'} 
          onClick={() => setActiveView('analytics')}
        >
          Health & Analytics
        </Button>
        <Button 
          justifyContent="flex-start" 
          variant={activeView === 'faculty' ? 'solid' : 'ghost'} 
          colorScheme={activeView === 'faculty' ? 'blue' : 'whiteAlpha'} 
          color={activeView === 'faculty' ? 'white' : 'gray.300'} 
          onClick={() => setActiveView('faculty')}
        >
          Flagged Personnel
        </Button>
        <Button 
          justifyContent="flex-start" 
          variant={activeView === 'export' ? 'solid' : 'ghost'} 
          colorScheme={activeView === 'export' ? 'blue' : 'whiteAlpha'} 
          color={activeView === 'export' ? 'white' : 'gray.300'} 
          onClick={() => setActiveView('export')}
        >
          Data Export
        </Button>
      </VStack>
      <VStack spacing={4} mt="auto">
        <Button w="100%" variant="outline" color="gray.300" borderColor="gray.600" _hover={{ color: 'white', borderColor: 'gray.400' }} onClick={toggleColorMode}>
          {colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}
        </Button>
        <Button w="100%" colorScheme="red" variant="solid" onClick={() => { localStorage.clear(); navigate('/'); }}>
          Logout
        </Button>
      </VStack>
    </Box>
  );

  return (
    <Flex minH="100vh" bg={mainBg}>
      {renderSidebar()}
      <Box flex="1" p={10} overflowY="auto">
        <Box mb={8}>
          <Heading size="lg" color={textColor} letterSpacing="tight">
            {activeView === 'analytics' && "Department Health & Compliance"}
            {activeView === 'faculty' && "Personnel Review Queue"}
            {activeView === 'export' && "Report Generation"}
          </Heading>
          <Text color={mutedText} mt={1}>Welcome, {userName}</Text>
        </Box>

        {activeView === 'analytics' && (
          <Box>
            {stats.noUpdate > 0 && (
              <Box bg="orange.50" border="1px solid" borderColor="orange.200" borderRadius="lg" p={4} mb={4} display="flex" alignItems="center" gap={3}>
                <Box w="8px" h="8px" borderRadius="full" bg="orange.400" flexShrink={0} />
                <Text fontSize="13px" color="orange.800">
                  <strong>{stats.noUpdate} faculty member{stats.noUpdate > 1 ? 's have' : ' has'}</strong>{' '}
                  not updated their status today. Students checking this board may not have accurate information before commuting.
                </Text>
              </Box>
            )}

            <SimpleGrid columns={{ base: 2, md: 5 }} spacing={3} mb={6}>
              <Box bg={cardBg} borderRadius="lg" p={4} shadow="sm" borderWidth="1px" borderColor={borderColor}>
                <Text fontSize="11px" color="gray.500" mb={1} textTransform="uppercase">Total Faculty</Text>
                <Text fontSize="28px" fontWeight="600" color={textColor} lineHeight="1">{stats.total}</Text>
              </Box>

              <Box bg={cardBg} borderRadius="lg" p={4} shadow="sm" borderWidth="1px" borderColor={borderColor}>
                <Text fontSize="11px" color="gray.500" mb={1} textTransform="uppercase" display="flex" alignItems="center" gap={1}>
                  <Box as="span" w="7px" h="7px" borderRadius="full" bg="green.400" /> On Campus
                </Text>
                <Text fontSize="28px" fontWeight="600" color="green.500" lineHeight="1">{stats.present}</Text>
              </Box>

              <Box bg={cardBg} borderRadius="lg" p={4} shadow="sm" borderWidth="1px" borderColor={borderColor}>
                <Text fontSize="11px" color="gray.500" mb={1} textTransform="uppercase" display="flex" alignItems="center" gap={1}>
                  <Box as="span" w="7px" h="7px" borderRadius="full" bg="red.400" /> Absent
                </Text>
                <Text fontSize="28px" fontWeight="600" color="red.500" lineHeight="1">{stats.absent}</Text>
              </Box>

              <Box bg={cardBg} borderRadius="lg" p={4} shadow="sm" borderLeft="3px solid" borderLeftColor={stats.noUpdate > 0 ? 'orange.400' : 'transparent'} borderColor={borderColor}>
                <Text fontSize="11px" color="gray.500" mb={1} textTransform="uppercase" display="flex" alignItems="center" gap={1}>
                  <Box as="span" w="7px" h="7px" borderRadius="full" bg="orange.400" /> No Update
                </Text>
                <Text fontSize="28px" fontWeight="600" lineHeight="1" color={stats.noUpdate > 0 ? 'orange.500' : 'gray.400'}>{stats.noUpdate}</Text>
              </Box>

              <Box bg={cardBg} borderRadius="lg" p={4} shadow="sm" borderWidth="1px" borderColor={borderColor}>
                <Text fontSize="11px" color="gray.500" mb={1} textTransform="uppercase">Compliance</Text>
                <Text fontSize="28px" fontWeight="600" lineHeight="1" color={stats.compliance >= 80 ? 'green.500' : stats.compliance >= 50 ? 'orange.500' : 'red.500'}>
                  {stats.compliance}%
                </Text>
              </Box>
            </SimpleGrid>

            <Box display="flex" gap={6} flexDir={{ base: 'column', md: 'row' }}>
              <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm" flex="1" textAlign="center">
                <Heading size="md" mb={4} color={textColor}>System Compliance</Heading>
                <CircularProgress value={stats.compliance} color="blue.500" size="120px" thickness="12px">
                  <CircularProgressLabel color={textColor}>{stats.compliance}%</CircularProgressLabel>
                </CircularProgress>
                <Text mt={4} color={mutedText} fontSize="sm">Faculty updating status on time</Text>
              </Box>
              <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm" flex="2">
                 <Heading size="md" mb={4} color={textColor}>Department Overview</Heading>
                 <Text color={textColor}>The attendance health remains stable. Currently, {inClassCount} instructors are conducting classes. Action is only required for the {absentCount} individuals flagged for absence or leave.</Text>
              </Box>
            </Box>
          </Box>
        )}

        {activeView === 'faculty' && (
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm">
            <Heading size="md" mb={4} color="red.500">Action Required: Flagged Absences</Heading>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead><Tr><Th color={mutedText}>Name</Th><Th color={mutedText}>Position</Th><Th color={mutedText}>Current Status</Th><Th color={mutedText}>Action</Th></Tr></Thead>
                <Tbody>
                  {flaggedFaculty.map((prof) => (
                    <Tr key={prof._id}>
                      <Td fontWeight="bold" color={textColor}>{prof.name}</Td>
                      <Td color={textColor}>{prof.programPosition}</Td>
                      <Td><Badge colorScheme="red">{prof.currentStatus.replace(/_/g, ' ')}</Badge></Td>
                      <Td><Button size="xs" colorScheme="red" variant="outline">Review Record</Button></Td>
                    </Tr>
                  ))}
                  {flaggedFaculty.length === 0 && <Tr><Td colSpan={4} textAlign="center" color={mutedText}>No faculty currently flagged.</Td></Tr>}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {activeView === 'export' && (
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm" maxW="600px">
            <VStack spacing={6} align="stretch">
              <Box>
                <Heading size="md" mb={2} color={textColor}>Download Master Report</Heading>
                <Text fontSize="sm" color={mutedText} mb={4}>Export a CSV containing all current live statuses and analytics.</Text>
                <Button size="lg" colorScheme="blue" w="100%" onClick={generateReport}>Download CSV Report</Button>
              </Box>
              <Divider borderColor={borderColor} />
              <Box>
                <Heading size="md" mb={2} color={textColor}>Filtered Date Export (Prototype)</Heading>
                <HStack spacing={4} mb={4}>
                  <FormControl><FormLabel color={textColor}>Start Date</FormLabel><Input type="date" color={textColor} /></FormControl>
                  <FormControl><FormLabel color={textColor}>End Date</FormLabel><Input type="date" color={textColor}/></FormControl>
                </HStack>
                <Button w="100%" onClick={() => alert('Phase 2 Integration: Date querying requires backend log processing.')}>Generate PDF</Button>
              </Box>
            </VStack>
          </Box>
        )}
      </Box>
    </Flex>
  );
}