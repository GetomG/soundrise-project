#!/usr/bin/env python3

class GasCalculator:
    def __init__(self, gas_price_gwei, eth_usd_price=None):
        self.gas_price_gwei = float(gas_price_gwei)
        self.eth_usd_price = float(eth_usd_price) if eth_usd_price else None
        self.gwei_to_wei = 10**9
        self.wei_to_eth = 10**18

    def calculate_gas_cost(self, gas_used):
        gas_used = int(gas_used)
        gas_price_wei = self.gas_price_gwei * self.gwei_to_wei
        cost_wei = gas_used * gas_price_wei
        cost_eth = cost_wei / self.wei_to_eth
        cost_usd = cost_eth * self.eth_usd_price if self.eth_usd_price else None
        
        result = {
            "gas_used": gas_used,
            "gas_price_gwei": self.gas_price_gwei,
            "cost_eth": cost_eth
        }
        if cost_usd is not None:
            result["cost_usd"] = cost_usd
        return result

    def print_cost(self, gas_used_list, label="Transaction"):
        print(f"\n{label}:")
        total_gas = 0
        total_eth = 0.0
        total_usd = 0.0 if self.eth_usd_price else None
        
        for i, gas_used in enumerate(gas_used_list, 1):
            cost = self.calculate_gas_cost(gas_used)
            total_gas += cost["gas_used"]
            total_eth += cost["cost_eth"]
            if total_usd is not None:
                total_usd += cost["cost_usd"]
            
            print(f"Step {i}:")
            print(f"  Gas Used: {cost['gas_used']}")
            print(f"  Gas Price: {cost['gas_price_gwei']} Gwei")
            print(f"  Cost: {cost['cost_eth']:.8f} ETH")
            if "cost_usd" in cost:
                print(f"  Cost: ${cost['cost_usd']:.2f} USD")
        
        print(f"Total for {label}:")
        print(f"  Total Gas Used: {total_gas}")
        print(f"  Total Cost: {total_eth:.8f} ETH")
        if total_usd is not None:
            print(f"  Total Cost: ${total_usd:.2f} USD")

def main():
    # Configuration (March 26, 2025 estimate)
    gas_price_gwei = 15  # Moderate gas price
    eth_usd_price = 3000  # Hypothetical ETH price
    
    calculator = GasCalculator(gas_price_gwei, eth_usd_price)
    
    # Test scenarios based on SoundRise operations
    test_scenarios = [
        ([70755], "Scenario 1: Artist Registration"),
        ([195241], "Scenario 2: Upload New Song"),
        ([78384], "Scenario 3: Purchase Song with ETH"),
        ([58417], "Scenario 4: Play Song and Pay Royalty"),
        ([117507], "Scenario 5: Rate Song and Mint 5 SRT"),
        ([90060], "Scenario 6: Redeem Exclusive Content with SRT"),
        ([52451, 195241, 78384], "Scenario 7: Full Flow - Register, Upload, Purchase")
    ]
    
    for gas_used_list, label in test_scenarios:
        calculator.print_cost(gas_used_list, label)

if __name__ == "__main__":
    main()