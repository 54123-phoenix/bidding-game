"""Strategy base class for the bidding game.

A Strategy is a reusable behavioral pattern that a player can adopt.
Multiple strategies can be compared in parallel simulations.

Reference: Axelrod library strategy pattern — composable, testable, comparable.
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class Strategy(ABC):
    """Abstract strategy for salary negotiation."""

    name: str = "base"
    description: str = ""

    @abstractmethod
    def initial_offer(self, reservation: int, budget: int, context: dict) -> int:
        """Compute the first offer/demand."""
        ...

    @abstractmethod
    def respond(self, opponent_offer: int, my_previous: int, round_num: int, context: dict) -> dict:
        """Respond to opponent's offer. Returns {'action': str, 'amount': int}."""
        ...


class HonestStrategy(Strategy):
    """Always offer/demand exactly what you want. No games."""

    name = "honest"
    description = "Truthful offers — no bluffing, no anchoring tricks."

    def initial_offer(self, reservation: int, budget: int, context: dict) -> int:
        return reservation

    def respond(self, opponent_offer: int, my_previous: int, round_num: int, context: dict) -> dict:
        if opponent_offer >= context.get("reservation", 0):
            return {"action": "accept", "amount": opponent_offer}
        if round_num >= 3:
            return {"action": "accept", "amount": opponent_offer}  # Give up
        return {"action": "counter_offer", "amount": context.get("reservation", 0)}


class AggressiveStrategy(Strategy):
    """Start high, concede slowly. Maximize personal gain."""

    name = "aggressive"
    description = "High anchor → slow concession → maximize individual payoff."

    def initial_offer(self, reservation: int, budget: int, context: dict) -> int:
        return int(reservation * 1.30)

    def respond(self, opponent_offer: int, my_previous: int, round_num: int, context: dict) -> dict:
        reservation = context.get("reservation", 0)
        if opponent_offer >= reservation * 1.10:
            return {"action": "accept", "amount": opponent_offer}
        new_offer = int(my_previous - (my_previous - reservation) * 0.15)
        if round_num >= 4:
            return {"action": "accept", "amount": opponent_offer} if opponent_offer >= reservation else {"action": "reject", "amount": 0}
        return {"action": "counter_offer", "amount": max(new_offer, reservation)}


class TitForTatStrategy(Strategy):
    """Match opponent's concessions. Cooperate if they cooperate."""

    name = "tit_for_tat"
    description = "Reciprocal — match the opponent's concession rate."

    def initial_offer(self, reservation: int, budget: int, context: dict) -> int:
        return int(reservation * 1.15)

    def respond(self, opponent_offer: int, my_previous: int, round_num: int, context: dict) -> dict:
        if round_num == 0:
            return {"action": "counter_offer", "amount": my_previous}
        # Match opponent's concession percentage
        prev_opponent = context.get("previous_opponent_offer", opponent_offer)
        if prev_opponent > 0:
            concession = (prev_opponent - opponent_offer) / prev_opponent
            new_offer = int(my_previous - my_previous * abs(concession))
        else:
            new_offer = my_previous
        if abs(opponent_offer - new_offer) / max(new_offer, 1) < 0.10:
            return {"action": "accept", "amount": int((opponent_offer + new_offer) / 2)}
        return {"action": "counter_offer", "amount": new_offer}


class GradualStrategy(Strategy):
    """Start fair, concede linearly. Seek middle ground."""

    name = "gradual"
    description = "Fair opening → linear concession → seek win-win."

    def initial_offer(self, reservation: int, budget: int, context: dict) -> int:
        return int(reservation * 1.10)

    def respond(self, opponent_offer: int, my_previous: int, round_num: int, context: dict) -> dict:
        max_rounds = context.get("max_rounds", 5)
        reservation = context.get("reservation", 0)
        # Linear concession toward midpoint
        fraction = round_num / max_rounds
        target = int(my_previous + (opponent_offer - my_previous) * fraction * 0.5)
        if abs(opponent_offer - target) / max(target, 1) < 0.15:
            return {"action": "accept", "amount": opponent_offer}
        if target <= reservation:
            return {"action": "reject", "amount": 0}
        return {"action": "counter_offer", "amount": target}


class ConservativeStrategy(Strategy):
    """Start low, concede quickly. Prioritize safety."""

    name = "conservative"
    description = "Cautious opening → quick concession → minimize risk of rejection."

    def initial_offer(self, reservation: int, budget: int, context: dict) -> int:
        return int(reservation * 0.95)

    def respond(self, opponent_offer: int, my_previous: int, round_num: int, context: dict) -> dict:
        reservation = context.get("reservation", 0)
        if opponent_offer >= reservation * 0.85:
            return {"action": "accept", "amount": opponent_offer}
        new_offer = int(my_previous - (my_previous - opponent_offer) * 0.3)
        if round_num >= 2:
            return {"action": "accept", "amount": opponent_offer} if opponent_offer >= reservation * 0.8 else {"action": "reject", "amount": 0}
        return {"action": "counter_offer", "amount": max(new_offer, int(reservation * 0.8))}
