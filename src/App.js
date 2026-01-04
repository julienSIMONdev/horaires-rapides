import React, { useState, useEffect, useCallback } from 'react';

// Configuration Google OAuth
const CLIENT_ID = '459711878327-frju1q5jiqhekogrggmuo69hl7b4httj.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

const App = () => {
  const [selectedDates, setSelectedDates] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState({});
  const [notification, setNotification] = useState(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);

  const horaires = [
    { id: 1, debut: '08:00', fin: '16:10', label: '8h00 - 16h10', calendarTitle: '8h-16h10', color: '#E91E63', bgColor: '#FCE4EC', colorId: '4' },
    { id: 2, debut: '08:30', fin: '16:40', label: '8h30 - 16h40', calendarTitle: '8h30-16h40', color: '#9C27B0', bgColor: '#F3E5F5', colorId: '3' },
    { id: 3, debut: '08:40', fin: '17:00', label: '8h40 - 17h00', calendarTitle: '8h40-17h', color: '#FF9800', bgColor: '#FFF3E0', colorId: '6' },
    { id: 4, debut: '09:00', fin: '17:10', label: '9h00 - 17h10', calendarTitle: '9h-17h10', color: '#00BCD4', bgColor: '#E0F7FA', colorId: '7' },
    { id: 5, debut: null, fin: null, label: 'Récup', calendarTitle: 'Récup', color: '#4CAF50', bgColor: '#E8F5E9', isRecup: true, colorId: '2' },
  ];

  const joursSemaine = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Charger les scripts Google
  useEffect(() => {
    // Charger GAPI
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
      window.gapi.load('client', async () => {
        await window.gapi.client.init({
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        });
        setGapiLoaded(true);
      });
    };
    document.body.appendChild(gapiScript);

    // Charger GIS (Google Identity Services)
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => {
      setGisLoaded(true);
    };
    document.body.appendChild(gisScript);

    return () => {
      if (gapiScript.parentNode) gapiScript.parentNode.removeChild(gapiScript);
      if (gisScript.parentNode) gisScript.parentNode.removeChild(gisScript);
    };
  }, []);

  // Initialiser le token client quand GIS est chargé
  useEffect(() => {
    if (gisLoaded && gapiLoaded) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.access_token) {
            setIsSignedIn(true);
            showNotification('Connecté à Google Calendar !', 'success');
          }
        },
      });
      setTokenClient(client);
    }
  }, [gisLoaded, gapiLoaded]);

  const handleSignIn = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    }
  };

  const handleSignOut = () => {
    const token = window.gapi.client.getToken();
    if (token !== null) {
      window.google.accounts.oauth2.revoke(token.access_token);
      window.gapi.client.setToken('');
      setIsSignedIn(false);
      showNotification('Déconnecté de Google Calendar', 'info');
    }
  };

  const getDateKey = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    let current = new Date(firstDay);
    while (current.getDay() !== 1) {
      current.setDate(current.getDate() - 1);
    }

    while (current <= lastDay || days.length % 5 !== 0) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        days.push({
          date: new Date(current),
          isCurrentMonth: current.getMonth() === month
        });
      }
      current.setDate(current.getDate() + 1);
      if (days.length >= 35) break;
    }

    return days;
  };

  const getWeeksInMonth = useCallback(() => {
    const days = getDaysInMonth(currentMonth);
    const weeks = [];
    for (let i = 0; i < days.length; i += 5) {
      weeks.push(days.slice(i, i + 5));
    }
    return weeks.filter(week => week.some(d => d.isCurrentMonth));
  }, [currentMonth]);

  const selectWeek = (weekIndex) => {
    const weeks = getWeeksInMonth();
    const week = weeks[weekIndex];
    if (!week) return;
    
    const weekdayKeys = week
      .filter(d => d.isCurrentMonth)
      .map(d => getDateKey(d.date));
    
    setSelectedDates(weekdayKeys);
    setSelectedWeekStart(weekIndex);
  };

  const toggleDate = (date) => {
    const dateKey = getDateKey(date);
    setSelectedDates(prev => {
      if (prev.includes(dateKey)) {
        return prev.filter(d => d !== dateKey);
      }
      return [...prev, dateKey];
    });
    setSelectedWeekStart(null);
  };

  const clearSelection = () => {
    setSelectedDates([]);
    setSelectedWeekStart(null);
  };

  const applyHoraire = (horaire) => {
    if (selectedDates.length === 0) {
      showNotification('Sélectionnez d\'abord des jours !', 'warning');
      return;
    }

    const newEvents = { ...events };
    selectedDates.forEach(dateKey => {
      newEvents[dateKey] = horaire;
    });
    setEvents(newEvents);
    
    const count = selectedDates.length;
    showNotification(
      `${horaire.label} ajouté pour ${count} jour${count > 1 ? 's' : ''} !`,
      'success'
    );
    setSelectedDates([]);
    setSelectedWeekStart(null);
  };

  const removeEvent = (dateKey, e) => {
    e.stopPropagation();
    const newEvents = { ...events };
    delete newEvents[dateKey];
    setEvents(newEvents);
    showNotification('Horaire supprimé', 'info');
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const exportToGoogleCalendar = async () => {
    const eventsList = Object.entries(events);
    if (eventsList.length === 0) {
      showNotification('Aucun horaire à exporter !', 'warning');
      return;
    }

    if (!isSignedIn) {
      showNotification('Connectez-vous d\'abord à Google Calendar !', 'warning');
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const [dateKey, horaire] of eventsList) {
      try {
        const [year, month, day] = dateKey.split('-');
        
        let event;
        if (horaire.isRecup) {
          event = {
            summary: horaire.calendarTitle,
            start: {
              date: dateKey,
            },
            end: {
              date: `${year}-${month}-${String(parseInt(day) + 1).padStart(2, '0')}`,
            },
            colorId: horaire.colorId,
          };
        } else {
          event = {
            summary: horaire.calendarTitle,
            start: {
              dateTime: `${dateKey}T${horaire.debut}:00`,
              timeZone: 'Europe/Paris',
            },
            end: {
              dateTime: `${dateKey}T${horaire.fin}:00`,
              timeZone: 'Europe/Paris',
            },
            colorId: horaire.colorId,
          };
        }

        await window.gapi.client.calendar.events.insert({
          calendarId: 'primary',
          resource: event,
        });
        
        successCount++;
      } catch (error) {
        console.error('Erreur lors de l\'ajout:', error);
        errorCount++;
      }
    }

    setIsLoading(false);
    
    if (errorCount === 0) {
      showNotification(`${successCount} événement(s) ajouté(s) à Google Agenda !`, 'success');
      setEvents({});
    } else {
      showNotification(`${successCount} ajouté(s), ${errorCount} erreur(s)`, 'warning');
    }
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const days = getDaysInMonth(currentMonth);
  const today = new Date();
  const todayKey = getDateKey(today);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FDF8F3 0%, #F5EDE4 50%, #EDE4D8 100%)',
      fontFamily: "'Nunito', 'Segoe UI', sans-serif",
      padding: '20px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Playfair+Display:wght@600&display=swap');
        
        * {
          box-sizing: border-box;
        }
        
        .calendar-day {
          transition: all 0.2s ease;
        }
        
        .calendar-day:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .horaire-btn {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .horaire-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        
        .horaire-btn:active {
          transform: translateY(-1px);
        }
        
        .notification {
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .remove-btn {
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .day-with-event:hover .remove-btn {
          opacity: 1;
        }

        .google-btn {
          transition: all 0.2s ease;
        }

        .google-btn:hover {
          transform: scale(1.02);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>

      {/* Notification */}
      {notification && (
        <div className="notification" style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          borderRadius: '12px',
          background: notification.type === 'success' ? '#5A9367' : 
                      notification.type === 'warning' ? '#D4915D' : '#4A90A4',
          color: 'white',
          fontWeight: '600',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          zIndex: 1000,
        }}>
          {notification.message}
        </div>
      )}

      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '20px',
        }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '2.2rem',
            color: '#4A4038',
            margin: '0',
            letterSpacing: '-0.5px',
          }}>
            📅 Mes Horaires
          </h1>
        </div>

        {/* Connexion Google */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '15px',
        }}>
          {!isSignedIn ? (
            <button
              className="google-btn"
              onClick={handleSignIn}
              disabled={!gapiLoaded || !gisLoaded}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 24px',
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '8px',
                cursor: gapiLoaded && gisLoaded ? 'pointer' : 'wait',
                fontSize: '1rem',
                fontWeight: '500',
                color: '#444',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              {gapiLoaded && gisLoaded ? 'Se connecter avec Google' : 'Chargement...'}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: '#E8F5E9',
                borderRadius: '20px',
                color: '#4CAF50',
                fontWeight: '600',
                fontSize: '0.9rem',
              }}>
                ✓ Connecté à Google Calendar
              </span>
              <button
                onClick={handleSignOut}
                style={{
                  padding: '8px 16px',
                  background: '#f5f5f5',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: '#666',
                }}
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>

        {/* Boutons horaires - sticky */}
        <div style={{
          position: 'sticky',
          top: '0',
          zIndex: 100,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'center',
          marginBottom: '25px',
          padding: '20px',
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 4px 20px rgba(139, 115, 85, 0.15)',
        }}>
          {horaires.map(horaire => (
            <button
              key={horaire.id}
              className="horaire-btn"
              onClick={() => applyHoraire(horaire)}
              style={{
                padding: '14px 24px',
                fontSize: '1rem',
                fontWeight: '700',
                fontFamily: "'Nunito', sans-serif",
                border: 'none',
                borderRadius: '14px',
                cursor: 'pointer',
                background: horaire.bgColor,
                color: horaire.color,
                boxShadow: `0 3px 10px ${horaire.color}25`,
                borderLeft: `4px solid ${horaire.color}`,
              }}
            >
              {horaire.label}
            </button>
          ))}
        </div>

        {/* Calendrier */}
        <div style={{
          background: 'white',
          borderRadius: '24px',
          padding: '25px',
          boxShadow: '0 8px 40px rgba(139, 115, 85, 0.12)',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '100%',
        }}>
          {/* Navigation mois */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}>
            <button onClick={prevMonth} style={{
              background: '#F5F0EB',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              cursor: 'pointer',
              fontSize: '1.2rem',
              color: '#4A4038',
              fontWeight: '600',
            }}>
              ← 
            </button>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.6rem',
              color: '#4A4038',
              margin: 0,
            }}>
              {moisNoms[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <button onClick={nextMonth} style={{
              background: '#F5F0EB',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              cursor: 'pointer',
              fontSize: '1.2rem',
              color: '#4A4038',
              fontWeight: '600',
            }}>
              →
            </button>
          </div>

          {/* Sélection par semaine */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '15px',
            alignItems: 'center',
          }}>
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
              <span style={{
                color: '#8B7355',
                fontSize: '0.9rem',
                fontWeight: '600',
                alignSelf: 'center',
              }}>
                Sélectionner semaine :
              </span>
              {getWeeksInMonth().map((week, index) => {
                const firstDay = week.find(d => d.isCurrentMonth);
                const lastDay = [...week].reverse().find(d => d.isCurrentMonth);
                return (
                  <button
                    key={index}
                    onClick={() => selectWeek(index)}
                    style={{
                      background: selectedWeekStart === index ? '#5A9367' : '#EDF6EF',
                      color: selectedWeekStart === index ? 'white' : '#5A9367',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '8px 14px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      fontFamily: "'Nunito', sans-serif",
                    }}
                  >
                    {firstDay?.date.getDate()}-{lastDay?.date.getDate()}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button onClick={clearSelection} style={{
                background: '#FDF3E9',
                color: '#D4915D',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 18px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                fontFamily: "'Nunito', sans-serif",
              }}>
                ✕ Effacer sélection
              </button>
              {selectedDates.length > 0 && (
                <span style={{
                  background: '#4A90A4',
                  color: 'white',
                  borderRadius: '20px',
                  padding: '10px 16px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                }}>
                  {selectedDates.length} jour{selectedDates.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Jours de la semaine */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
            marginBottom: '10px',
            width: '100%',
          }}>
            {joursSemaine.map(jour => (
              <div key={jour} style={{
                textAlign: 'center',
                fontWeight: '700',
                color: '#8B7355',
                fontSize: '0.9rem',
                padding: '8px 2px',
                minWidth: 0,
              }}>
                {jour}
              </div>
            ))}
          </div>

          {/* Grille des jours */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
            width: '100%',
          }}>
            {days.map((dayInfo, index) => {
              const dateKey = getDateKey(dayInfo.date);
              const isSelected = selectedDates.includes(dateKey);
              const event = events[dateKey];
              const isToday = dateKey === todayKey;

              return (
                <div
                  key={index}
                  className={`calendar-day ${event ? 'day-with-event' : ''}`}
                  onClick={() => dayInfo.isCurrentMonth && toggleDate(dayInfo.date)}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    cursor: dayInfo.isCurrentMonth ? 'pointer' : 'default',
                    background: event ? event.bgColor :
                               isSelected ? '#4A90A4' :
                               isToday ? '#FFF9E6' :
                               !dayInfo.isCurrentMonth ? '#FAFAFA' : 'white',
                    border: isToday ? '2px solid #D4915D' :
                            isSelected ? '2px solid #4A90A4' :
                            event ? `2px solid ${event.color}` :
                            '1px solid #EDE4D8',
                    opacity: dayInfo.isCurrentMonth ? 1 : 0.4,
                    position: 'relative',
                    minWidth: 0,
                    overflow: 'hidden',
                    padding: '4px',
                  }}
                >
                  <span style={{
                    fontSize: '1.1rem',
                    fontWeight: isToday ? '800' : '600',
                    color: isSelected ? 'white' :
                           event ? event.color :
                           isToday ? '#D4915D' :
                           '#4A4038',
                  }}>
                    {dayInfo.date.getDate()}
                  </span>
                  {event && (
                    <>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        color: event.color,
                        marginTop: '2px',
                        textAlign: 'center',
                        lineHeight: '1.2',
                      }}>
                        {event.isRecup ? 'Récup' : `${event.debut?.slice(0,5)}`}
                        {!event.isRecup && <br />}
                        {!event.isRecup && `${event.fin?.slice(0,5)}`}
                      </span>
                      <button
                        className="remove-btn"
                        onClick={(e) => removeEvent(dateKey, e)}
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          background: '#E74C3C',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                        }}
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bouton export - toujours visible */}
        <div style={{
          marginTop: '25px',
          textAlign: 'center',
        }}>
          <button
            onClick={exportToGoogleCalendar}
            disabled={Object.keys(events).length === 0 || isLoading}
            style={{
              background: Object.keys(events).length > 0 && !isLoading
                ? 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)'
                : '#E0E0E0',
              color: Object.keys(events).length > 0 ? 'white' : '#999',
              border: 'none',
              borderRadius: '16px',
              padding: '18px 40px',
              fontSize: '1.1rem',
              fontWeight: '700',
              fontFamily: "'Nunito', sans-serif",
              cursor: Object.keys(events).length > 0 && !isLoading ? 'pointer' : 'not-allowed',
              boxShadow: Object.keys(events).length > 0 && !isLoading
                ? '0 6px 25px rgba(66, 133, 244, 0.3)'
                : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.3s ease',
            }}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner" style={{ fontSize: '1.3rem' }}>⏳</span>
                Ajout en cours...
              </>
            ) : (
              <>
                <span style={{ fontSize: '1.3rem' }}>📤</span>
                {Object.keys(events).length > 0 
                  ? `Ajouter à Google Agenda (${Object.keys(events).length} événement${Object.keys(events).length > 1 ? 's' : ''})`
                  : 'Ajouter à Google Agenda'
                }
              </>
            )}
          </button>
          {Object.keys(events).length > 0 && isSignedIn && (
            <p style={{
              color: '#5A9367',
              fontSize: '0.9rem',
              marginTop: '10px',
            }}>
              ✓ Les événements seront ajoutés directement à votre agenda
            </p>
          )}
          {Object.keys(events).length > 0 && !isSignedIn && (
            <p style={{
              color: '#D4915D',
              fontSize: '0.9rem',
              marginTop: '10px',
            }}>
              ⚠️ Connectez-vous à Google pour ajouter les événements
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default App;
