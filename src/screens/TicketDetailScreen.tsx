
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Chip,
  Button,
  Text,
  Surface,
  Divider,
  TextInput,
  Avatar,
  Menu,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, onSnapshot, collection, addDoc, updateDoc, serverTimestamp, orderBy, query, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Ticket, Comment, User, TicketStatus, TicketPriority, TicketCategory } from '../types';

// Constantes con íconos de MaterialCommunityIcons
const TICKET_CATEGORIES: { value: TicketCategory; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { value: 'hardware', label: 'Hardware', icon: 'memory' },
  { value: 'software', label: 'Software', icon: 'apps' },
  { value: 'network', label: 'Redes', icon: 'wifi' },
  { value: 'printer', label: 'Impresoras', icon: 'printer-outline' },
  { value: 'user_support', label: 'Soporte Usuario', icon: 'account-circle-outline' },
  { value: 'other', label: 'Otro', icon: 'help-circle-outline' },
];

const TICKET_PRIORITIES: { value: TicketPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Baja', color: '#1B5E20' },
  { value: 'medium', label: 'Media', color: '#FF9800' },
  { value: 'high', label: 'Alta', color: '#F44336' },
];

const TICKET_STATUSES: { value: TicketStatus; label: string; color: string }[] = [
  { value: 'open', label: 'Abierto', color: '#2196F3' },
  { value: 'in_progress', label: 'En Progreso', color: '#FF9800' },
  { value: 'pending', label: 'Pendiente', color: '#9C27B0' },
  { value: 'resolved', label: 'Resuelto', color: '#1B5E20' },
  { value: 'closed', label: 'Cerrado', color: '#607D8B' },
];

// Helper para determinar si un color es claro u oscuro
const isColorLight = (color: string): boolean => {
  if (!color || !color.startsWith('#')) return false;
  const hex = color.replace('#', '');
  if (hex.length !== 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
};

interface TicketDetailScreenProps {
  user: User;
}

export default function TicketDetailScreen({ user }: TicketDetailScreenProps) {
  const navigation = useNavigation();
  const route = useRoute();
  const { ticketId } = route.params as { ticketId: string };
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [priorityMenuVisible, setPriorityMenuVisible] = useState(false);

  useEffect(() => {
    const ticketDocRef = doc(db, 'tickets', ticketId);
    const unsubscribeTicket = onSnapshot(ticketDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setTicket({ id: doc.id, ...data, createdAt: data.createdAt?.toDate() ?? new Date(), updatedAt: data.updatedAt?.toDate() ?? new Date() } as Ticket);
      } else {
        navigation.goBack();
      }
      setIsLoading(false);
    });

    const commentsQuery = query(collection(db, 'tickets', ticketId, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() ?? new Date() } as Comment));
      setComments(commentsData);
    });

    return () => { unsubscribeTicket(); unsubscribeComments(); };
  }, [ticketId]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;
    setIsAddingComment(true);
    try {
      await addDoc(collection(db, 'tickets', ticketId, 'comments'), {
        userId: user.id,
        userName: user.name,
        content: newComment.trim(),
        createdAt: serverTimestamp(),
      });
      setNewComment('');
    } catch (error) { Alert.alert('Error', 'No se pudo agregar el comentario.'); } 
    finally { setIsAddingComment(false); }
  };

  const handleUpdate = async (dataToUpdate: any) => {
    if (!ticket) return;
    const ticketDocRef = doc(db, 'tickets', ticketId);
    try {
      await updateDoc(ticketDocRef, { ...dataToUpdate, updatedAt: serverTimestamp() });
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el ticket.');
    }
  };

  const handleDelete = () => {
    if (!ticket) return;
    Alert.alert("Eliminar Ticket", "¿Estás seguro? Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'tickets', ticket.id));
          } catch (error) { 
            Alert.alert('Error', 'No se pudo eliminar el ticket.'); 
          }
        },
      },
    ]);
  };

  const getStatusColor = (status: TicketStatus) => TICKET_STATUSES.find(s => s.value === status)?.color || '#666';
  const getPriorityColor = (priority: TicketPriority) => TICKET_PRIORITIES.find(p => p.value === priority)?.color || '#666';
  const getCategoryIcon = (category: string) => TICKET_CATEGORIES.find(c => c.value === category)?.icon || 'help-circle-outline';
  const formatDate = (date: Date) => date ? date.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Fecha inválida';

  if (isLoading || !ticket) {
    return <View style={styles.loadingContainer}><MaterialCommunityIcons name="timer-sand" size={48} color="#666" /><Text style={styles.loadingText}>Cargando detalles...</Text></View>;
  }
  
  const categoryColor = '#2E7D32';
  const statusColor = getStatusColor(ticket.status);
  const priorityColor = getPriorityColor(ticket.priority);

  const categoryTextColor = isColorLight(categoryColor) ? '#000' : '#FFF';
  const statusTextColor = isColorLight(statusColor) ? '#000' : '#FFF';
  const priorityTextColor = isColorLight(priorityColor) ? '#000' : '#FFF';

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
      >
        <Surface style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <Title style={styles.title}>{ticket.title}</Title>
              <View style={styles.metaContainer}>
                <Chip 
                  icon={() => <MaterialCommunityIcons name={getCategoryIcon(ticket.category)} size={16} color={categoryTextColor} />} 
                  style={[styles.categoryChip, { backgroundColor: categoryColor }]}
                  textStyle={[styles.chipText, { color: categoryTextColor }]}
                  compact
                >
                  {TICKET_CATEGORIES.find(c => c.value === ticket.category)?.label}
                </Chip>
                <Chip 
                  style={[styles.statusChip, { backgroundColor: statusColor }]}
                  textStyle={[styles.chipText, { color: statusTextColor }]}
                  compact
                >
                  {TICKET_STATUSES.find(s => s.value === ticket.status)?.label}
                </Chip>
                <Chip 
                  style={[styles.priorityChip, { backgroundColor: priorityColor }]}
                  textStyle={[styles.chipText, { color: priorityTextColor }]}
                  compact
                >
                  {ticket.priority.toUpperCase()}
                </Chip>
              </View>
            </View>
          </View>
        </Surface>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Descripción</Title>
            <Paragraph style={styles.description}>{ticket.description}</Paragraph>
            <Divider style={styles.divider} />
            <Title style={styles.sectionTitle}>Información</Title>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}><MaterialCommunityIcons name="map-marker-outline" size={16} color="#666" /><Text style={styles.infoLabel}>Ubicación:</Text><Text style={styles.infoValue}>{ticket.location || 'No especificada'}</Text></View>
              <View style={styles.infoItem}><MaterialCommunityIcons name="calendar-outline" size={16} color="#666" /><Text style={styles.infoLabel}>Creado:</Text><Text style={styles.infoValue}>{formatDate(ticket.createdAt)}</Text></View>
              <View style={styles.infoItem}><MaterialCommunityIcons name="account-outline" size={16} color="#666" /><Text style={styles.infoLabel}>Creado por:</Text><Text style={styles.infoValue}>{ticket.createdByName}</Text></View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Comentarios ({comments.length})</Title>
            {comments.length === 0 ? <View style={styles.emptyComments}><MaterialCommunityIcons name="comment-multiple-outline" size={32} color="#ccc" /><Text style={styles.emptyCommentsText}>No hay comentarios</Text></View> : comments.map(c => (
              <View key={c.id} style={styles.commentItem}>
                <View style={styles.commentHeader}><Avatar.Text size={32} label={c.userName.charAt(0)} /><View style={styles.commentInfo}><Text style={styles.commentAuthor}>{c.userName}</Text><Text style={styles.commentDate}>{formatDate(c.createdAt)}</Text></View></View>
                <Paragraph style={styles.commentContent}>{c.content}</Paragraph>
              </View>
            ))}
            <Divider style={styles.divider} />
            <View style={styles.addCommentContainer}>
              <TextInput label="Agregar comentario" value={newComment} onChangeText={setNewComment} mode="outlined" multiline numberOfLines={3} style={styles.commentInput} />
              <Button mode="contained" onPress={handleAddComment} loading={isAddingComment} disabled={!newComment.trim() || isAddingComment} style={styles.addCommentButton}>Agregar</Button>
            </View>
          </Card.Content>
        </Card>

        {user?.role === 'admin' && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>Acciones de Administrador</Title>
              <View style={styles.actionGrid}>
                  <Menu
                      visible={priorityMenuVisible}
                      onDismiss={() => setPriorityMenuVisible(false)}
                      anchor={<Button mode="outlined" onPress={() => setPriorityMenuVisible(true)} icon="arrow-up-circle-outline" style={styles.actionButton} textColor="#2E7D32">Prioridad: {ticket.priority}</Button>}
                  >
                      {TICKET_PRIORITIES.map(p => <Menu.Item key={p.value} onPress={() => { handleUpdate({ priority: p.value }); setPriorityMenuVisible(false);}} title={p.label} />)}
                  </Menu>
                  {ticket.status !== 'resolved' && <Button mode="contained" onPress={() => handleUpdate({ status: 'resolved' })} style={[styles.actionButton, {backgroundColor: '#1B5E20'}]} icon="check" textColor="white">Resolver</Button>}
                  {ticket.status !== 'in_progress' && <Button mode="outlined" onPress={() => handleUpdate({ status: 'in_progress' })} style={styles.actionButton} icon="play" textColor="#2E7D32">En Progreso</Button>}
                  <Button mode="outlined" onPress={handleDelete} style={[styles.actionButton, styles.deleteButton]} icon="trash-can-outline" textColor="#B00020">Eliminar</Button>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#F5F5F5',
    },
    scrollView: { 
        flex: 1,
    },
    scrollContent: { 
        paddingBottom: 100, 
        flexGrow: 1 
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
    loadingText: { fontSize: 16, color: '#666', marginTop: 16 },
    header: { backgroundColor: 'white', padding: 16, elevation: 2 },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    titleContainer: { flex: 1 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 12 },
    metaContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    categoryChip: { justifyContent: 'center', alignItems: 'center' },
    statusChip: { justifyContent: 'center', alignItems: 'center' },
    priorityChip: { justifyContent: 'center', alignItems: 'center' },
    chipText: { fontSize: 10, fontWeight: 'bold' },
    card: { margin: 16, marginTop: 8, elevation: 1 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginBottom: 12 },
    description: { fontSize: 16, lineHeight: 24, color: '#333' },
    divider: { marginVertical: 16 },
    infoGrid: { gap: 12 },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoLabel: { fontSize: 14, color: '#666', fontWeight: '500' },
    infoValue: { fontSize: 14, color: '#333', flex: 1 },
    emptyComments: { alignItems: 'center', padding: 32 },
    emptyCommentsText: { fontSize: 16, color: '#666', marginTop: 8 },
    commentItem: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
    commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    commentInfo: { flex: 1, marginLeft: 12 },
    commentAuthor: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    commentDate: { fontSize: 12, color: '#666' },
    commentContent: { fontSize: 14, color: '#333', lineHeight: 20, marginLeft: 44 },
    addCommentContainer: { marginTop: 16 },
    commentInput: { marginBottom: 12 },
    addCommentButton: { backgroundColor: '#2E7D32' },
    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    actionButton: { paddingHorizontal: 12 },
    deleteButton: { borderColor: '#B00020' },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
});
