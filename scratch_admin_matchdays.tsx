        {activeTab === 'admin-matchdays' && isAdmin && (
          <div>
            <h2 style={{ marginBottom: '16px' }}>Gestión de Quinielas y Partidos</h2>

            {/* Selector de estado de Quiniela */}
            {activeMatchday && (
              <div className="card">
                <h3>Estado de la Quiniela N° {activeMatchday.number}</h3>
                {activeMatchday.status === 'active' && (
                  <div style={{ padding: '12px 16px', background: 'rgba(255, 193, 7, 0.1)', color: 'var(--primary)', borderRadius: '8px', marginTop: '16px', borderLeft: '4px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                    <Clock size={18} /> Cierre programado en: {getRemainingTime(activeMatchday.deadline)}
                  </div>
                )}
                {activeMatchday.status === 'inactive' ? (
                  <div style={{ marginTop: '12px', background: 'rgba(255, 193, 7, 0.05)', border: '1px solid var(--primary)', padding: '16px', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 8px 0', color: 'var(--primary)', fontWeight: 'bold' }}>Quiniela en Creación (Inactiva)</p>
                    <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>Los usuarios no pueden ver esta quiniela. Agrega los partidos y define la fecha límite para publicarla.</p>
                    <div style={{ marginBottom: '16px', padding: '12px', borderLeft: '4px solid var(--primary)', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '4px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 'bold' }}>
                          <Calendar size={16} /> Fecha y Hora del Primer Partido
                        </label>
                        <input 
                          type="datetime-local" 
                          className="form-control" 
                          value={firstMatchDate}
                          onChange={e => setFirstMatchDate(e.target.value)}
                          onFocus={e => {
                            try { e.target.showPicker(); } catch(err) {}
                          }}
                          style={{ marginTop: '8px' }}
                        />
                      </div>
                    </div>
                    <div style={{ marginBottom: '16px', padding: '12px', borderLeft: '4px solid #dc3545', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '4px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc3545', fontWeight: 'bold' }}>
                          <AlertCircle size={16} /> Fecha y Hora Límite de Cierre
                        </label>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>Debe ser al menos 8 horas antes del primer partido.</p>
                        <input 
                          type="datetime-local" 
                          className="form-control" 
                          value={activationDate}
                          onChange={e => setActivationDate(e.target.value)}
                          onFocus={e => {
                            try { e.target.showPicker(); } catch(err) {}
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      <button className="btn btn-primary" onClick={handleActivateMatchday} style={{ width: '100%' }}>
                        <Play size={15} /> Validar y Activar Quiniela
                      </button>
                      <button onClick={handleDeleteMatchday} className="btn" style={{ background: '#dc3545', border: 'none', color: 'white', fontWeight: '600' }}>
                        <Trash2 size={15} /> Eliminar quiniela en creación
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <button 
                      className={`btn ${activeMatchday.status === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '10px 4px', fontSize: '0.8rem' }}
                      onClick={() => handleToggleMatchdayStatus('active')}
                    >
                      <Unlock size={14} /> Abierta
                    </button>
                    <button 
                      className={`btn ${activeMatchday.status === 'closed' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '10px 4px', fontSize: '0.8rem' }}
                      onClick={() => handleToggleMatchdayStatus('closed')}
                    >
                      <Lock size={14} /> Cerrada
                    </button>
                    <button 
                      className={`btn ${activeMatchday.status === 'calculated' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '10px 4px', fontSize: '0.8rem', opacity: (matches.length === 0 || !matches.every(m => m.result)) && activeMatchday.status !== 'calculated' ? 0.5 : 1 }}
                      onClick={() => handleToggleMatchdayStatus('calculated')}
                      disabled={(matches.length === 0 || !matches.every(m => m.result)) && activeMatchday.status !== 'calculated'}
                      title={(matches.length === 0 || !matches.every(m => m.result)) ? 'Faltan partidos por calificar' : ''}
                    >
                      <CheckSquare size={14} /> Calificada
                    </button>
                    <button 
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '10px 4px', fontSize: '0.8rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', opacity: 0.5, cursor: 'not-allowed' }}
                      disabled={true}
                      title="No se puede volver a inactiva una vez abierta"
                      onClick={() => {
                        setConfirmConfig({
                          title: 'Volver a Inactiva',
                          message: '¿Seguro que deseas revertir esta quiniela a Inactiva? Desaparecerá de la vista de los usuarios.',
                          onConfirm: () => {
                            handleToggleMatchdayStatus('inactive');
                            setConfirmConfig(null);
                          }
                        });
                      }}
                    >
                      <RotateCcw size={14} /> Inactiva
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Crear Nueva Quiniela (Solo visible si no hay activa/inactiva) */}
            {(!activeMatchday || activeMatchday.status === 'calculated') && (
              <div className="card">
              <h3>Crear Siguiente Quiniela</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>
                Creará de forma secuencial la siguiente quiniela del torneo activo con costo estándar.
              </p>
              <button className="btn btn-primary" onClick={handleCreateMatchday}>
                <PlusCircle size={16} /> Inicializar Siguiente Quiniela
              </button>
              </div>
            )}

            {/* Agregar Partido — solo visible cuando la quiniela está inactiva */}
            {activeMatchday && activeMatchday.status === 'inactive' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Agregar Partido a la Quiniela N° {activeMatchday.number}</h3>
                  <div style={{ fontSize: '0.85rem', color: (matches.length * 2 === teams.length && teams.length > 0) ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    Equipos asignados: <strong style={{ color: (matches.length * 2 === teams.length && teams.length > 0) ? 'var(--primary)' : 'var(--text-primary)' }}>{matches.length * 2} / {teams.length}</strong>
                  </div>
                </div>
                <form onSubmit={handleAddMatch} style={{ marginTop: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Equipo Local</label>
                      <SearchableSelect
                        value={newHomeTeam}
                        onChange={setNewHomeTeam}
                        options={availableHomeTeams}
                        placeholder="Ej. América"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Equipo Visitante</label>
                      <SearchableSelect
                        value={newAwayTeam}
                        onChange={setNewAwayTeam}
                        options={availableAwayTeams}
                        placeholder="Ej. Chivas"
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox" 
                      id="reserveMatch"
                      checked={isReserveMatch} 
                      onChange={e => setIsReserveMatch(e.target.checked)} 
                    />
                    <label htmlFor="reserveMatch" style={{ margin: 0, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      Marcar como Partido Extra de Reserva (Desempate)
                    </label>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>
                    Agregar Partido
                  </button>
                </form>
              </div>
            )}

            {/* Resultados y Calificación */}
            {activeMatchday && matches.length > 0 && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3>{activeMatchday.status === 'inactive' ? 'Partidos de la Quiniela' : 'Calificar Partidos'}</h3>
                  {(activeMatchday.status === 'closed' || activeMatchday.status === 'calculated') && (
                    <button 
                      className="btn btn-primary" 
                      onClick={handleCalculatePoints}
                    >
                      <CheckCircle size={15} /> Calcular Aciertos e Histórico
                    </button>
                  )}
                </div>

                {sortedMatches.map((match, idx) => (
                  <div key={match.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                    {/* Número y badge */}
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '36px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>P{idx + 1}</span>
                      {match.is_reserve && <span style={{ fontSize: '0.55rem', color: 'var(--primary)', fontWeight: 'bold' }}>EXTRA</span>}
                    </div>

                    {/* Nombres de equipos */}
                    <div style={{ flex: 1, minWidth: '220px', fontSize: '0.82rem', display: 'grid', gridTemplateColumns: '160px 24px 1fr', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        {getTeamLogo(match, true) ? <img src={getTeamLogo(match, true)} alt="Home" style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }} /> : null}
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTeamName(match, true)}</span>
                      </div>
                      
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>vs</span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        {getTeamLogo(match, false) ? <img src={getTeamLogo(match, false)} alt="Away" style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }} /> : null}
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTeamName(match, false)}</span>
                      </div>
                    </div>

                    {/* Botones: solo eliminar si inactiva, calificar si cerrada/calculada */}
                    {activeMatchday?.status === 'inactive' && (
                      <button
                        className="lev-btn"
                        style={{ background: 'var(--bg-main)', color: 'white', borderColor: 'var(--border-color)' }}
                        onClick={() => handleDeleteMatch(match.id)}
                        title="Eliminar Partido"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {(activeMatchday?.status === 'closed' || activeMatchday?.status === 'calculated') && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <button className={`lev-btn ${match.result === 'L' ? 'selected-l' : ''}`} onClick={() => handleSetMatchResult(match.id, 'L')}>L</button>
                        <button className={`lev-btn ${match.result === 'E' ? 'selected-e' : ''}`} onClick={() => handleSetMatchResult(match.id, 'E')}>E</button>
                        <button className={`lev-btn ${match.result === 'V' ? 'selected-v' : ''}`} onClick={() => handleSetMatchResult(match.id, 'V')}>V</button>
                        <button
                          className="lev-btn"
                          style={{ background: match.result === 'A' ? 'var(--danger)' : 'var(--bg-main)', color: match.result === 'A' ? 'white' : 'var(--danger)', borderColor: 'var(--danger)' }}
                          onClick={() => setConfirmConfig({ title: 'Anular Partido', message: '¿Anular partido? Solo aplica el partido extra como desempate.', onConfirm: () => { handleSetMatchResult(match.id, 'A'); setConfirmConfig(null); } })}
                          title="Anular"
                        >A</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
