import React from 'react';

const PageHeader = ({ title, subtitle, icon: Icon, badges, actions }) => {
  return (
    <div style={{ 
      background: 'linear-gradient(to right, var(--surface), rgba(253, 248, 245, 0.5))',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 4px 20px rgba(74, 29, 36, 0.05)',
      border: '1px solid rgba(74, 29, 36, 0.06)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {Icon && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: 'var(--primary-light)', 
            borderRadius: '12px', 
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={24} strokeWidth={2.5} />
          </div>
        )}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-1px' }}>{title}</h1>
            {badges && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {badges}
              </div>
            )}
          </div>
          {subtitle && (
            <div style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '15px' }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
