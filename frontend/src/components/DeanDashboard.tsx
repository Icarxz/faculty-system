import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Button as ChakraButton, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Badge, Input, SimpleGrid, HStack, Flex, VStack, CircularProgress, CircularProgressLabel, Divider, 
  useColorMode, useColorModeValue, FormControl, FormLabel
} from '@chakra-ui/react';

export default function DeanDashboard() {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName');
  const { colorMode, toggleColorMode } = useColorMode();
  
  const [activePage, setActivePage] = useState('analytics');
  const [faculty, setFaculty] = useState<any[]>([]);

  // ── Custom Theme Tokens ───────────────────────────────────────────────
  const dk = colorMode === 'dark';
  const C = {
    pageBg:    dk ? "#0c1421" : "#eef2f7",
    sidebar:   dk ? "#070e1b" : "#0f2240",
    text:      dk ? "#e8f0fe" : "#0f2240",
    navText:   dk ? "#7a93b0" : "#8eaecb",
    navActive: dk ? "#ffffff" : "#ffffff",
    navBg:     dk ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.10)",
  };
  const btnBase: React.CSSProperties = { border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing:"0.01em" };

  const cardBg = useColorModeValue('#ffffff', '#111d30');
  const borderColor = useColorModeValue('#dde3ec', '#1e3048');
  const textColor = useColorModeValue('#0f2240', '#e8f0fe');
  const mutedText = useColorModeValue('#6b7fa0', '#7a93b0');

  const stats = useMemo(() => {
    const total    = faculty.length;
    const present  = faculty.filter(f => ['AVAILABLE', 'IN_CLASS', 'IN_MEETING', 'ON_BREAK'].includes(f.currentStatus)).length;
    const absent   = faculty.filter(f => ['ABSENT', 'ON_LEAVE'].includes(f.currentStatus)).length;
    const noUpdate = faculty.filter(f => !f.currentStatus || f.currentStatus === 'NOT_UPDATED').length;
    const compliance = total > 0 ? Math.round(((total - noUpdate) / total) * 100) : 0;
    return { total, present, absent, noUpdate, compliance };
  }, [faculty]);

  const fetchStatus = () => {
    fetch('http://localhost:5000/api/faculty/status')
      .then((res) => res.json())
      .then((data) => setFaculty(data));
  };

  useEffect(() => {
    fetchStatus();
    const intervalId = setInterval(fetchStatus, 30000); 
    return () => clearInterval(intervalId);
  }, []);

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
    csvContent += `\nANALYTICS SUMMARY\nTotal Personnel,${stats.total}\nCurrently Available,${faculty.filter(f => f.currentStatus === 'AVAILABLE').length}\nIn Classrooms,${faculty.filter(f => f.currentStatus === 'IN_CLASS').length}\nAbsent/On Leave,${stats.absent}\nGenerated On,${new Date().toLocaleString()}\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Dean_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click(); document.body.removeChild(link);
  };

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: C.pageBg, fontFamily: "'Segoe UI', system-ui, sans-serif", color: C.text, overflow: "hidden" }}>
      
      {/* ── Custom Sidebar ── */}
      <aside style={{ width: "196px", flexShrink: 0, background: C.sidebar, display: "flex", flexDirection: "column", padding: "22px 14px" }}>
        <div style={{ padding: "4px 8px 28px" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.14em", color: "#fff", textTransform: "uppercase" }}>Dean's Office</span>
          <div style={{ marginTop: "7px", width: "20px", height: "3px", background: "#2563eb", borderRadius: "2px" }} />
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          {[
            { page: "analytics", label: "Health & Analytics" },
            { page: "faculty", label: "Flagged Personnel" },
            { page: "export", label: "Data Export" }
          ].map(({ page, label }) => {
            const active = activePage === page;
            return (
              <button key={page} onClick={() => setActivePage(page)} style={{
                  ...btnBase, display: "flex", alignItems: "center", gap: "10px", padding: "9px 10px", borderRadius: "7px",
                  background: active ? C.navBg : "transparent", color: active ? C.navActive : C.navText,
                  fontWeight: active ? 600 : 400, fontSize: "13px", textAlign: "left",
                  borderLeft: active ? "2px solid #2563eb" : "2px solid transparent", transition: "all 0.15s ease",
                }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: active ? "#60a5fa" : "transparent", border: active ? "none" : "1.5px solid #3a5373", flexShrink: 0 }} />
                {label}
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />
        <button onClick={toggleColorMode} style={{ ...btnBase, padding: "9px 12px", borderRadius: "7px", border: `1px solid ${dk ? "#1e3048" : "rgba(255,255,255,0.12)"}`, background: "transparent", color: C.navText, fontSize: "12px", textAlign: "left", display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span>{dk ? "☀" : "☾"}</span> {dk ? "Light Mode" : "Dark Mode"}
        </button>
        <button onClick={() => { localStorage.clear(); navigate('/'); }} style={{ ...btnBase, padding: "9px 12px", borderRadius: "7px", background: "#dc2626", color: "#fff", fontSize: "12px", fontWeight: 600 }}>Logout</button>
      </aside>

      {/* ── Main Content ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <div style={{ padding: "32px", overflowY: "auto", height: "100%" }}>
          <h1 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", color: textColor }}>
            {activePage === 'analytics' && "Department Health & Compliance"}
            {activePage === 'faculty' && "Personnel Review Queue"}
            {activePage === 'export' && "Report Generation"}
          </h1>

          {activePage === 'analytics' && (
            <Box>
              {stats.noUpdate > 0 && (
                <Box bg="orange.50" border="1px solid" borderColor="orange.200" borderRadius="lg" p={4} mb={4} display="flex" alignItems="center" gap={3}>
                  <Box w="8px" h="8px" borderRadius="full" bg="orange.400" flexShrink={0} />
                  <Text fontSize="13px" color="orange.800">
                    <strong>{stats.noUpdate} faculty member{stats.noUpdate > 1 ? 's have' : ' has'}</strong> not updated their status today.
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
                   <Text color={textColor}>The attendance health remains stable. Action is only required for the {stats.absent} individuals flagged for absence or leave.</Text>
                </Box>
              </Box>
            </Box>
          )}

          {activePage === 'faculty' && (
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
                        <Td><ChakraButton size="xs" colorScheme="red" variant="outline">Review Record</ChakraButton></Td>
                      </Tr>
                    ))}
                    {flaggedFaculty.length === 0 && <Tr><Td colSpan={4} textAlign="center" color={mutedText}>No faculty currently flagged.</Td></Tr>}
                  </Tbody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {activePage === 'export' && (
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm" maxW="600px">
              <VStack spacing={6} align="stretch">
                <Box>
                  <Heading size="md" mb={2} color={textColor}>Download Master Report</Heading>
                  <Text fontSize="sm" color={mutedText} mb={4}>Export a CSV containing all current live statuses and analytics.</Text>
                  <ChakraButton size="lg" colorScheme="blue" w="100%" onClick={generateReport}>Download CSV Report</ChakraButton>
                </Box>
                <Divider borderColor={borderColor} />
                <Box>
                  <Heading size="md" mb={2} color={textColor}>Filtered Date Export (Prototype)</Heading>
                  <HStack spacing={4} mb={4}>
                    <FormControl><FormLabel color={textColor}>Start Date</FormLabel><Input type="date" color={textColor} borderColor={borderColor}/></FormControl>
                    <FormControl><FormLabel color={textColor}>End Date</FormLabel><Input type="date" color={textColor} borderColor={borderColor}/></FormControl>
                  </HStack>
                  <ChakraButton w="100%" onClick={() => alert('Phase 2 Integration: Date querying requires backend log processing.')}>Generate PDF</ChakraButton>
                </Box>
              </VStack>
            </Box>
          )}
        </div>
      </main>
    </div>
  );
}