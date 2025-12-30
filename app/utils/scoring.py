"""
Scoring utilities.
Calculates scores based on speed and correctness.
"""
def calculate_score(room):
    """
    Calculate scores for all participants.
    
    Scoring rules:
    - Fastest correct answer gets 100 points
    - Other correct answers get points based on speed:
      - If x% slower than fastest, get (1-x)% of points
      - Minimum 1 point per correct answer
    - Bonus points are added regardless of correctness
    """
    participants = room.get('participants', {})
    answers = room.get('answers', {})
    scores = {}
    
    # Initialize scores
    for participant_id in participants:
        scores[participant_id] = 0
    
    # Process each question
    for question_id, question_answers in answers.items():
        # Get all correct answers with their submission times
        correct_answers = []
        for participant_id, answer_data in question_answers.items():
            if answer_data.get('correct', False):
                correct_answers.append({
                    'participant_id': participant_id,
                    'submission_time': answer_data.get('submission_time', 0),
                    'bonus_points': answer_data.get('bonus_points', 0)
                })
        
        if not correct_answers:
            # No correct answers, but still add bonus points
            for participant_id, answer_data in question_answers.items():
                bonus = answer_data.get('bonus_points', 0)
                if participant_id in scores:
                    scores[participant_id] += bonus
            continue
        
        # Sort by submission time (fastest first)
        correct_answers.sort(key=lambda x: x['submission_time'])
        
        # Fastest gets 100 points
        fastest_time = correct_answers[0]['submission_time']
        
        if fastest_time == 0:
            # All answers submitted at same time (or time not recorded)
            # Give everyone 100 points
            for answer in correct_answers:
                participant_id = answer['participant_id']
                bonus = answer['bonus_points']
                if participant_id in scores:
                    scores[participant_id] += 100 + bonus
        else:
            # Calculate points based on speed
            for answer in correct_answers:
                participant_id = answer['participant_id']
                submission_time = answer['submission_time']
                bonus = answer['bonus_points']
                
                # Calculate percentage slower
                if fastest_time > 0:
                    time_diff = submission_time - fastest_time
                    percent_slower = time_diff / fastest_time
                else:
                    percent_slower = 0
                
                # Calculate points: (1 - percent_slower) * 100
                # But ensure minimum of 1 point
                base_points = max(1, int(round((1 - percent_slower) * 100)))
                
                if participant_id in scores:
                    scores[participant_id] += base_points + bonus
    
    return scores



