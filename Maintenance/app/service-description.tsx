import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');

export default function ServiceDescriptionScreen() {
  const { serviceId, serviceName } = useLocalSearchParams();
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);
  const [needsParts, setNeedsParts] = useState(false);

  const serviceData = {
    id: serviceId || '1',
    name: serviceName || 'Car Repair Service',
    price: 100,
    unit: 'Per hour',
    rating: 4.9,
    users: '1605K User',
    description: 'The Model B is a Ford automobile with production starting in model year 1932 and ending in model year 1934. It was the Ford Motor Company\'s second car under the Model A, and was replaced by the 1935 Model 48.',
    image: 'https://via.placeholder.com/400x200/4A90E2/FFFFFF?text=Car+Repair',
    location: '2972 Westheimer Rd. Santa Ana, Illinois 85488',
  };

  const handleBookNow = () => {
    setShowDateTimeModal(true);
  };

  const handleDateTimeConfirm = () => {
    setShowDateTimeModal(false);
    router.push({
      pathname: '/payment',
      params: { 
        serviceId: serviceData.id,
        serviceName: serviceData.name,
        price: serviceData.price,
        location: serviceData.location
      }
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Repair Service</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Service Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: serviceData.image }} style={styles.serviceImage} />
          <View style={styles.priceBadge}>
            <Text style={styles.priceUnit}>{serviceData.unit}</Text>
            <View style={styles.priceDivider} />
            <Text style={styles.priceAmount}>${serviceData.price}</Text>
          </View>
        </View>

        {/* Service Description */}
        <View style={styles.descriptionContainer}>
          <View style={styles.descriptionHeader}>
            <Text style={styles.descriptionTitle}>Service Description</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.rating}>{serviceData.rating}</Text>
            </View>
          </View>
          
          <View style={styles.userCount}>
            <Ionicons name="person" size={16} color="#666" />
            <Text style={styles.userCountText}>{serviceData.users}</Text>
          </View>

          <Text style={styles.descriptionText}>{serviceData.description}</Text>

          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => setNeedsParts(!needsParts)}
          >
            <View style={[styles.checkbox, needsParts && styles.checkboxChecked]}>
              {needsParts && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxText}>I need Parts for my Vehicle</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Vehicle Information */}
        <View style={styles.vehicleInfoContainer}>
          <Text style={styles.vehicleInfoTitle}>Emergency Vehicle information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#666" />
              <Text style={styles.infoText}>Vehicle location</Text>
              <Ionicons name="settings" size={20} color="#666" />
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="car" size={20} color="#666" />
              <Text style={styles.infoText}>Vehicle Model</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Book Now Button */}
      <TouchableOpacity style={styles.bookButton} onPress={handleBookNow}>
        <Text style={styles.bookButtonText}>Book Now</Text>
      </TouchableOpacity>

      {/* Date & Time Modal */}
      <Modal
        visible={showDateTimeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDateTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Date & Time</Text>
              <TouchableOpacity onPress={() => setShowDateTimeModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.tabContainer}>
              <TouchableOpacity style={[styles.tab, styles.activeTab]}>
                <Text style={styles.activeTabText}>Date</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tab}>
                <Text style={styles.tabText}>Time</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity>
                  <Ionicons name="chevron-back" size={20} color="#999" />
                </TouchableOpacity>
                <Text style={styles.monthYear}>January 2023</Text>
                <TouchableOpacity>
                  <Ionicons name="chevron-forward" size={20} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.calendarGrid}>
                <Text style={styles.dayHeader}>Sun</Text>
                <Text style={styles.dayHeader}>Mon</Text>
                <Text style={styles.dayHeader}>Tue</Text>
                <Text style={styles.dayHeader}>Wed</Text>
                <Text style={styles.dayHeader}>Thu</Text>
                <Text style={styles.dayHeader}>Fri</Text>
                <Text style={styles.dayHeader}>Sat</Text>
                
                {/* Calendar days would go here */}
                <Text style={styles.dayText}>26</Text>
                <Text style={styles.dayText}>27</Text>
                <Text style={styles.dayText}>28</Text>
                <Text style={styles.dayText}>29</Text>
                <Text style={styles.dayText}>30</Text>
                <Text style={styles.dayText}>31</Text>
                <Text style={styles.dayText}>1</Text>
                <Text style={styles.dayText}>2</Text>
                <Text style={styles.dayText}>3</Text>
                <Text style={styles.dayText}>4</Text>
                <Text style={styles.dayText}>5</Text>
                <Text style={styles.dayText}>6</Text>
                <Text style={styles.dayText}>7</Text>
                <Text style={styles.dayText}>8</Text>
                <Text style={styles.dayText}>9</Text>
                <Text style={styles.dayText}>10</Text>
                <Text style={styles.dayText}>11</Text>
                <Text style={styles.dayText}>12</Text>
                <Text style={styles.dayText}>13</Text>
                <Text style={styles.dayText}>14</Text>
                <Text style={styles.dayText}>15</Text>
                <Text style={styles.dayText}>16</Text>
                <Text style={styles.dayText}>17</Text>
                <Text style={styles.dayText}>18</Text>
                <Text style={[styles.dayText, styles.selectedDay]}>19</Text>
                <Text style={styles.dayText}>20</Text>
                <Text style={styles.dayText}>21</Text>
                <Text style={styles.dayText}>22</Text>
                <Text style={styles.dayText}>23</Text>
                <Text style={styles.dayText}>24</Text>
                <Text style={styles.dayText}>25</Text>
                <Text style={styles.dayText}>26</Text>
                <Text style={styles.dayText}>27</Text>
                <Text style={styles.dayText}>28</Text>
                <Text style={styles.dayText}>29</Text>
                <Text style={styles.dayText}>30</Text>
                <Text style={styles.dayText}>31</Text>
                <Text style={styles.dayText}>1</Text>
                <Text style={styles.dayText}>2</Text>
                <Text style={styles.dayText}>3</Text>
                <Text style={styles.dayText}>4</Text>
                <Text style={styles.dayText}>5</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.checkoutButton} onPress={handleDateTimeConfirm}>
              <Text style={styles.checkoutButtonText}>Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 24,
  },
  imageContainer: {
    position: 'relative',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  serviceImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  priceBadge: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: [{ translateX: -60 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  priceUnit: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  priceDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 8,
  },
  priceAmount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  descriptionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  userCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userCountText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  checkboxText: {
    fontSize: 14,
    color: '#333',
  },
  vehicleInfoContainer: {
    paddingHorizontal: 20,
    marginBottom: 100,
  },
  vehicleInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginLeft: 12,
  },
  bookButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FF4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FF4444',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  calendarContainer: {
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthYear: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayHeader: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 8,
  },
  dayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 14,
    color: '#333',
    paddingVertical: 12,
  },
  selectedDay: {
    backgroundColor: '#FF4444',
    color: '#FFFFFF',
    borderRadius: 20,
  },
  checkoutButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
