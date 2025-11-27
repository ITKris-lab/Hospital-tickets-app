
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
  Button,
  Text,
  Surface,
  TextInput,
  Avatar,
  List,
  Switch,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { db } from '../firebaseConfig';
import { User } from '../types';

interface ProfileScreenProps {
  user: User;
  onLogout: () => void;
}

export default function ProfileScreen({ user, onLogout }: ProfileScreenProps) {
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedSector, setEditedSector] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  useEffect(() => {
    if (user) {
      setEditedName(user.name);
      setEditedSector(user.sector || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!editedName.trim() || !editedSector.trim() || !user) {
      Alert.alert('Error', 'El nombre y el sector son obligatorios.');
      return;
    }

    setIsLoading(true);
    const userDocRef = doc(db, 'users', user.id);

    try {
      const updatedData = {
        name: editedName.trim(),
        sector: editedSector.trim(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(userDocRef, updatedData);

      Alert.alert('Éxito', 'Perfil actualizado correctamente');
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert('Error', 'No se pudo actualizar el perfil.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedName(user.name);
    setEditedSector(user.sector || '');
    setIsEditing(false);
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        onLogout();
      }
    } else {
      Alert.alert(
        'Cerrar Sesión',
        '¿Estás seguro de que quieres cerrar sesión?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cerrar Sesión', onPress: onLogout, style: 'destructive' },
        ]
      );
    }
  };

  // CAMBIO AQUÍ: 'Paciente' -> 'Usuario Básico'
  const getRoleDisplayName = (role: User['role']) => ({ admin: 'Administrador', patient: 'Usuario Básico' }[role] || 'Usuario');
  const getRoleIcon = (role: User['role']) => ({ admin: 'shield-checkmark', patient: 'person' }[role] || 'help-circle');

  if (!user) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header}>
        <View style={styles.headerContent}>
          <Avatar.Text size={80} label={user.name.charAt(0).toUpperCase()} style={styles.avatar} />
          <View style={styles.userInfo}>
            <Title style={styles.userName}>{user.name}</Title>
            <Paragraph style={styles.userRole}>
              <Ionicons name={getRoleIcon(user.role)} size={16} color="#2E7D32" />
              {' '}{getRoleDisplayName(user.role)}
            </Paragraph>
            {user.sector && (
              <Paragraph style={styles.userDepartment}>
                <Ionicons name="briefcase" size={16} color="#666" />
                {' '}{user.sector}
              </Paragraph>
            )}
          </View>
        </View>
      </Surface>

      {/* Botón de Administración visible solo para admins */}
      {user.role === 'admin' && (
        <Card style={[styles.card, { borderColor: '#2E7D32', borderWidth: 1 }]}>
          <Card.Content>
            <Button 
              mode="contained" 
              icon="shield-account" 
              onPress={() => navigation.navigate('Admin' as never)}
              style={{ backgroundColor: '#2E7D32' }}
            >
              Panel de Administración
            </Button>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>Información Personal</Title>
            {!isEditing && <Button mode="text" onPress={() => setIsEditing(true)} compact>Editar</Button>}
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <TextInput label="Nombre completo" value={editedName} onChangeText={setEditedName} mode="outlined" style={styles.input} />
              <TextInput label="Sector o Servicio" value={editedSector} onChangeText={setEditedSector} mode="outlined" style={styles.input} />
              <TextInput label="Correo electrónico" value={user.email} disabled mode="outlined" style={styles.input} />
              <View style={styles.editActions}>
                <Button mode="outlined" onPress={handleCancel} style={styles.editButton} disabled={isLoading}>Cancelar</Button>
                <Button mode="contained" onPress={handleSave} style={[styles.editButton, styles.saveButton]} loading={isLoading} disabled={isLoading}>Guardar</Button>
              </View>
            </View>
          ) : (
            <View style={styles.infoList}>
              <View style={styles.infoItem}><Ionicons name="person-outline" size={20} color="#666" /><Text style={styles.infoLabel}>Nombre:</Text><Text style={styles.infoValue}>{user.name}</Text></View>
              {user.sector && <View style={styles.infoItem}><Ionicons name="briefcase-outline" size={20} color="#666" /><Text style={styles.infoLabel}>Sector:</Text><Text style={styles.infoValue}>{user.sector}</Text></View>}
              <View style={styles.infoItem}><Ionicons name="mail-outline" size={20} color="#666" /><Text style={styles.infoLabel}>Email:</Text><Text style={styles.infoValue}>{user.email}</Text></View>
              <View style={styles.infoItem}><Ionicons name="calendar-outline" size={20} color="#666" /><Text style={styles.infoLabel}>Miembro desde:</Text><Text style={styles.infoValue}>{new Date(user.createdAt).toLocaleDateString('es-CL')}</Text></View>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Configuración</Title>
          <List.Item title="Notificaciones" description="Recibir notificaciones de tickets" left={(props) => <List.Icon {...props} icon="bell-outline" />} right={() => <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} color="#2E7D32" />} />
          <List.Item title="Modo Oscuro" description="Activar tema oscuro" left={(props) => <List.Icon {...props} icon="weather-night" />} right={() => <Switch value={darkModeEnabled} onValueChange={setDarkModeEnabled} color="#2E7D32" />} />
        </Card.Content>
      </Card>

      <View style={styles.logoutContainer}>
        <Button mode="outlined" onPress={handleLogout} style={styles.logoutButton} icon="logout">Cerrar Sesión</Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: 'white', padding: 20, elevation: 2, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  avatar: { backgroundColor: '#2E7D32', marginRight: 16 },
  userInfo: { flex: 1 },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  userRole: { fontSize: 16, color: '#2E7D32', marginBottom: 4 },
  userDepartment: { fontSize: 14, color: '#666' }, // Mantener para el sector
  card: { marginHorizontal: 16, marginVertical: 8, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32' },
  editForm: { gap: 16 },
  input: { backgroundColor: '#F8F9FA' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 8 },
  editButton: { flex: 1 },
  saveButton: { backgroundColor: '#2E7D32' },
  infoList: { gap: 16 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoLabel: { fontSize: 14, color: '#666', fontWeight: '500', minWidth: 100 },
  infoValue: { fontSize: 14, color: '#333', flex: 1 },
  logoutContainer: { padding: 16, paddingTop: 8, paddingBottom: 32 },
  logoutButton: { borderColor: '#C62828', borderWidth: 1, color: '#C62828' },
});
