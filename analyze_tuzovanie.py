import json


def analyze_log(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading json: {e}")
        return

    for i, event in enumerate(data):
        action = event.get("a")
        payload = event.get("d", {})

        # Look for initialization events
        if action in ["GAME_CREATED", "GAME_START", "TUZOVANIE_COMPLETE", "INIT_GAME"]:
            print(f"#{i} {action} -> {json.dumps(payload, indent=2)}")

            # Check specifically for dealer info
            if "dealerIndex" in payload:
                print(f"   => Dealer Index: {payload['dealerIndex']}")
            if "cardsDealt" in payload:
                cards = payload["cardsDealt"]
                print(f"   => Cards Dealt (Count: {len(cards)})")
                for idx, player_cards in enumerate(cards):
                    last_card = player_cards[-1] if player_cards else "None"
                    print(
                        f"      Player {idx}: {len(player_cards)} cards. Last: {last_card}"
                    )
                    # Check if last card is Ace
                    if (
                        isinstance(last_card, dict) and last_card.get("rank") == 14
                    ):  # Ace
                        print(f"      !!! ACE FOUND HERE (Player {idx}) !!!")


if __name__ == "__main__":
    analyze_log("last_game_log_v3.json")
