/**
 * Vault - Editorial Event Photography Commerce Platform (Kenya)
 * Refined photography marketplace: editorial brand, DM Serif & Inter typography,
 * warm Paper/Forest/Clay palette, verified M-Pesa checkout, and private admin console.
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { EventsListView } from './components/customer/EventsListView';
import { EventGallery } from './components/customer/EventGallery';
import { OrderLookupView } from './components/customer/OrderLookupView';
import { CartDrawer } from './components/customer/CartDrawer';
import { MpesaCheckoutModal } from './components/customer/MpesaCheckoutModal';
import { PhotoLightbox } from './components/customer/PhotoLightbox';
import { ReportPhotoModal } from './components/customer/ReportPhotoModal';
import { RefundModal } from './components/customer/RefundModal';
import { PhotographerDashboard } from './components/photographer/PhotographerDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ThemeFontCustomizer } from './components/customizer/ThemeFontCustomizer';
import { Photo, Order } from './types';

const MainContent: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    selectedEventId,
    setSelectedEventId,
    selectedPhotoForLightbox,
    setSelectedPhotoForLightbox,
    isCustomizerOpen,
    setIsCustomizerOpen,
  } = useApp();

  // Modals triggered from multiple views
  const [reportPhotoTarget, setReportPhotoTarget] = useState<Photo | null>(null);
  const [refundOrderTarget, setRefundOrderTarget] = useState<Order | null>(null);

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setCurrentView('event_gallery');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToEvents = () => {
    setSelectedEventId(null);
    setCurrentView('events');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F0E7] text-[#252723]">
      <Navbar />

      <main className="flex-1">
        {currentView === 'events' && (
          <EventsListView
            onSelectEvent={handleSelectEvent}
            onNavigateToLookup={() => setCurrentView('my_orders')}
          />
        )}

        {currentView === 'event_gallery' && selectedEventId && (
          <EventGallery
            eventId={selectedEventId}
            onBack={handleBackToEvents}
            onOpenReportModal={(photo) => setReportPhotoTarget(photo)}
          />
        )}

        {currentView === 'my_orders' && (
          <OrderLookupView
            onOpenRefundModal={(order) => setRefundOrderTarget(order)}
          />
        )}

        {currentView === 'studio' && <PhotographerDashboard />}

        {currentView === 'admin' && <AdminDashboard />}
      </main>

      <Footer />

      {/* Global Modals & Drawers */}
      <CartDrawer />
      <MpesaCheckoutModal />

      {selectedPhotoForLightbox && (
        <PhotoLightbox
          photo={selectedPhotoForLightbox}
          onClose={() => setSelectedPhotoForLightbox(null)}
          onOpenReportModal={(photo) => setReportPhotoTarget(photo)}
        />
      )}

      {reportPhotoTarget && (
        <ReportPhotoModal
          photo={reportPhotoTarget}
          onClose={() => setReportPhotoTarget(null)}
        />
      )}

      {refundOrderTarget && (
        <RefundModal
          order={refundOrderTarget}
          onClose={() => setRefundOrderTarget(null)}
        />
      )}

      {/* Live Web Font & UI Theme Customizer */}
      <ThemeFontCustomizer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
