
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Card,
  Title,
  Text,
  Surface,
  Chip,
  DataTable,
  Searchbar,
  FAB,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Ticket, User, TicketStatus, TicketCategory } from '../types';

// Constantes
const TICKET_CATEGORIES: { value: TicketCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'hardware', label: 'Hardware', icon: 'hardware-chip-outline' },
  { value: 'software', label: 'Software', icon: 'apps-outline' },
  { value: 'network', label: 'Redes', icon: 'wifi-outline' },
  { value: 'printer', label: 'Impresoras', icon: 'print-outline' },
  { value: 'user_support', label: 'Soporte Usuario', icon: 'person-circle-outline' },
  { value: 'other', label: 'Otro', icon: 'help-circle-outline' },
];

const TICKET_STATUSES: { value: TicketStatus; label: string; color: string }[] = [
  { value: 'open', label: 'Abierto', color: '#2196F3' },
  { value: 'in_progress', label: 'En Progreso', color: '#FF9800' },
  { value: 'pending', label: 'Pendiente', color: '#9C27B0' },
  { value: 'resolved', label: 'Resuelto', color: '#1B5E20' }, // Color mejorado
  { value: 'closed', label: 'Cerrado', color: '#607D8B' },
];

export default function AdminScreen() {
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'tickets' | 'users'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const ticketsQuery = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));

    const unsubTickets = onSnapshot(ticketsQuery, snapshot => {
      const ticketsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() ?? new Date() } as Ticket));
      setAllTickets(ticketsData);
      setFilteredTickets(ticketsData);
      checkLoading();
    });

    const unsubUsers = onSnapshot(usersQuery, snapshot => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() ?? new Date() } as User));
      setAllUsers(usersData);
      setFilteredUsers(usersData);
      checkLoading();
    });

    let loaded = { tickets: false, users: false };
    const checkLoading = () => {
      if (selectedTab === 'overview' && !loaded.tickets) loaded.tickets = true;
      if (selectedTab === 'overview' && !loaded.users) loaded.users = true;
      if (loaded.tickets && loaded.users) setIsLoading(false);
    }

    return () => { unsubTickets(); unsubUsers(); };
  }, []);

  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    if (selectedTab === 'tickets') {
      setFilteredTickets(allTickets.filter(t => t.title.toLowerCase().includes(lowercasedQuery) || t.id.toLowerCase().includes(lowercasedQuery)));
    } else if (selectedTab === 'users') {
      setFilteredUsers(allUsers.filter(u => u.name.toLowerCase().includes(lowercasedQuery) || u.sector?.toLowerCase().includes(lowercasedQuery)));
    }
  }, [searchQuery, selectedTab, allTickets, allUsers]);

  const getStatusColor = (status: TicketStatus) => TICKET_STATUSES.find(s => s.value === status)?.color || '#666';
  const getRoleDisplayName = (role: User['role']) => ({ admin: 'Admin', patient: 'Paciente' }[role] || 'Usuario');
  const getRoleIcon = (role: User['role']) => ({ admin: 'shield-checkmark', patient: 'person' }[role] || 'help-circle');

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Tickets por Categoría</Title>
          {TICKET_CATEGORIES.map(category => {
            const count = allTickets.filter(t => t.category === category.value).length;
            if (count === 0) return null;
            return (
              <View key={category.value} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Ionicons name={category.icon as any} size={20} color="#666" />
                  <Text style={styles.categoryLabel}>{category.label}</Text>
                </View>
                <Text style={styles.categoryCount}>{count}</Text>
              </View>
            );
          })}
        </Card.Content>
      </Card>
    </View>
  );

  const renderTickets = () => (
    <View style={styles.tabContent}>
      <Searchbar placeholder="Buscar por ID o título..." onChangeText={setSearchQuery} value={searchQuery} style={styles.searchbar} elevation={Platform.OS === 'android' ? 1 : 0} />
      <Card style={styles.card}>
        <DataTable>
          <DataTable.Header><DataTable.Title>ID</DataTable.Title><DataTable.Title>Título</DataTable.Title><DataTable.Title>Estado</DataTable.Title></DataTable.Header>
          {filteredTickets.map(ticket => (
            <DataTable.Row key={ticket.id}>
              <DataTable.Cell><Text style={styles.idCellText}>{`...${ticket.id.slice(-5)}`}</Text></DataTable.Cell>
              <DataTable.Cell><Text numberOfLines={1} style={styles.cellText}>{ticket.title}</Text></DataTable.Cell>
              <DataTable.Cell><Chip style={[styles.statusChip, { backgroundColor: getStatusColor(ticket.status) }]} textStyle={styles.chipText}>{TICKET_STATUSES.find(s => s.value === ticket.status)?.label}</Chip></DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      </Card>
    </View>
  );

  const renderUsers = () => (
    <View style={styles.tabContent}>
      <Searchbar placeholder="Buscar por nombre o sector..." onChangeText={setSearchQuery} value={searchQuery} style={styles.searchbar} elevation={Platform.OS === 'android' ? 1 : 0} />
      <Card style={styles.card}>
        <DataTable>
          <DataTable.Header><DataTable.Title>Usuario</DataTable.Title><DataTable.Title>Sector</DataTable.Title><DataTable.Title>Rol</DataTable.Title></DataTable.Header>
          {filteredUsers.map(u => (
            <DataTable.Row key={u.id}>
              <DataTable.Cell><View style={styles.userCell}><Ionicons name={getRoleIcon(u.role)} size={20} color="#666" /><Text style={styles.cellText}>{u.name}</Text></View></DataTable.Cell>
              <DataTable.Cell><Text style={styles.cellText}>{u.sector}</Text></DataTable.Cell>
              <DataTable.Cell><Chip style={[styles.roleChip, { backgroundColor: u.role === 'admin' ? '#1B5E20' : '#666' }]} textStyle={styles.chipText}>{getRoleDisplayName(u.role)}</Chip></DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      </Card>
    </View>
  );

  const renderContent = () => {
    if (isLoading) return <ActivityIndicator animating={true} color={'#2E7D32'} style={{ marginTop: 50 }} />;
    switch (selectedTab) {
        case 'overview': return renderOverview();
        case 'tickets': return renderTickets();
        case 'users': return renderUsers();
        default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.header}>
        <Title style={styles.headerTitle}>Panel de Administración</Title>
        <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tab, selectedTab === 'overview' && styles.tabActive]} onPress={() => setSelectedTab('overview')}><Ionicons name="stats-chart-outline" size={20} color={selectedTab === 'overview' ? 'white' : '#666'} /><Text style={[styles.tabText, selectedTab === 'overview' && styles.tabTextActive]}>Resumen</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.tab, selectedTab === 'tickets' && styles.tabActive]} onPress={() => setSelectedTab('tickets')}><Ionicons name="ticket-outline" size={20} color={selectedTab === 'tickets' ? 'white' : '#666'} /><Text style={[styles.tabText, selectedTab === 'tickets' && styles.tabTextActive]}>Tickets</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.tab, selectedTab === 'users' && styles.tabActive]} onPress={() => setSelectedTab('users')}><Ionicons name="people-outline" size={20} color={selectedTab === 'users' ? 'white' : '#666'} /><Text style={[styles.tabText, selectedTab === 'users' && styles.tabTextActive]}>Usuarios</Text></TouchableOpacity>
        </View>
      </Surface>

      <ScrollView style={styles.scrollView}>{renderContent()}</ScrollView>

      <FAB style={styles.fab} icon="cog-outline" onPress={() => {}} label="Ajustes" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: 'white', padding: 16, elevation: 4 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32', marginBottom: 16 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#E0E0E0', borderRadius: 8, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 6, gap: 6 },
  tabActive: { backgroundColor: '#2E7D32' },
  tabText: { fontSize: 14, color: '#333' },
  tabTextActive: { color: 'white', fontWeight: 'bold' },
  scrollView: { flex: 1 },
  tabContent: { padding: 16 },
  searchbar: { marginBottom: 16 },
  card: { marginBottom: 16, elevation: 1, borderWidth: 1, borderColor: '#E0E0E0' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' },
  statItem: { minWidth: '45%', alignItems: 'center', marginBottom: 16 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#333', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  categoryInfo: { flexDirection: 'row', alignItems: 'center' },
  categoryLabel: { fontSize: 14, color: '#333', marginLeft: 12 },
  categoryCount: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  idCellText: { fontSize: 10, color: '#666', fontFamily: 'monospace' },
  cellText: { fontSize: 12, color: '#333' },
  userCell: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusChip: { height: 22, justifyContent: 'center' },
  roleChip: { height: 22, justifyContent: 'center' },
  chipText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#2E7D32' },
});
