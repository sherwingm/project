import { ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Balance, Settlement, Person } from '../types';

interface BalanceViewProps {
  balances: Balance[];
  settlements: Settlement[];
  members: Person[];
}

export function BalanceView({ balances, settlements, members }: BalanceViewProps) {
  const getMemberById = (id: string) => members.find(m => m.id === id);

  const isSettled = settlements.length === 0;

  return (
    <div className="space-y-6">
      {/* Settlement Status */}
      <div className={`p-4 rounded-lg border ${
        isSettled 
          ? 'bg-green-50 border-green-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center space-x-2">
          {isSettled ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          )}
          <h3 className={`font-semibold ${
            isSettled ? 'text-green-800' : 'text-yellow-800'
          }`}>
            {isSettled ? 'All Settled!' : 'Pending Settlements'}
          </h3>
        </div>
        <p className={`text-sm mt-1 ${
          isSettled ? 'text-green-700' : 'text-yellow-700'
        }`}>
          {isSettled 
            ? 'Everyone is even. No money needs to be exchanged.'
            : `${settlements.length} payment${settlements.length > 1 ? 's' : ''} needed to settle all debts.`
          }
        </p>
      </div>

      {/* Individual Balances */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Individual Balances</h3>
        <div className="space-y-3">
          {balances.map((balance) => {
            const member = getMemberById(balance.personId);
            if (!member) return null;

            const isOwed = balance.balance > 0;
            const isEven = Math.abs(balance.balance) < 0.01;

            return (
              <div
                key={balance.personId}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: member.color }}
                  />
                  <span className="font-medium text-gray-900">{member.name}</span>
                </div>
                
                <div className="text-right">
                  {isEven ? (
                    <span className="text-green-600 font-medium">Even</span>
                  ) : isOwed ? (
                    <div>
                      <div className="text-green-600 font-semibold">
                        +₹{Math.abs(balance.balance).toFixed(2)}
                      </div>
                      <div className="text-xs text-green-600">is owed</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-red-600 font-semibold">
                        -₹{Math.abs(balance.balance).toFixed(2)}
                      </div>
                      <div className="text-xs text-red-600">owes</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Suggested Settlements */}
      {settlements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Suggested Payments</h3>
          <div className="space-y-3">
            {settlements.map((settlement, index) => {
              const fromMember = getMemberById(settlement.from);
              const toMember = getMemberById(settlement.to);
              
              if (!fromMember || !toMember) return null;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: fromMember.color }}
                      />
                      <span className="font-medium">{fromMember.name}</span>
                    </div>
                    
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: toMember.color }}
                      />
                      <span className="font-medium">{toMember.name}</span>
                    </div>
                  </div>
                  
                  <div className="text-lg font-bold text-blue-600">
                    ₹{settlement.amount.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}