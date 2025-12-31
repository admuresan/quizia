#!/usr/bin/env python3
"""
Cleanup script to remove invalid participant view configs from quiz files.

Elements should only have configs in participant view if they are questions (is_question = true).
This script removes participant view configs for non-question elements.
"""

import json
import sys
from pathlib import Path

def cleanup_quiz_file(quiz_file_path):
    """Clean up a single quiz file by removing invalid participant view configs."""
    try:
        with open(quiz_file_path, 'r', encoding='utf-8') as f:
            quiz_data = json.load(f)
        
        modified = False
        pages = quiz_data.get('pages', [])
        
        for page in pages:
            elements = page.get('elements', {})
            views = page.get('views', {})
            participant_view = views.get('participant', {})
            participant_configs = participant_view.get('local_element_configs', {})
            
            if not participant_configs:
                continue
            
            # Find all element IDs that have configs in participant view
            element_ids_in_participant = list(participant_configs.keys())
            
            for element_id in element_ids_in_participant:
                element_data = elements.get(element_id)
                
                # If element doesn't exist in elements dict, remove the config
                if not element_data:
                    print(f"  Removing orphaned participant config for element: {element_id}")
                    del participant_configs[element_id]
                    modified = True
                    continue
                
                # If element is not a question, remove participant view config
                is_question = element_data.get('is_question', False)
                if not is_question:
                    print(f"  Removing participant config for non-question element: {element_id} (type: {element_data.get('type', 'unknown')})")
                    del participant_configs[element_id]
                    modified = True
        
        if modified:
            # Write back the cleaned quiz data
            with open(quiz_file_path, 'w', encoding='utf-8') as f:
                json.dump(quiz_data, f, indent=2, ensure_ascii=False)
            print(f"✓ Cleaned: {quiz_file_path.name}")
            return True
        else:
            print(f"  No changes needed: {quiz_file_path.name}")
            return False
            
    except Exception as e:
        print(f"✗ Error processing {quiz_file_path.name}: {e}")
        return False

def main():
    """Main function to clean up all quiz files."""
    # Get the quizes folder path
    script_dir = Path(__file__).parent
    quizes_folder = script_dir / 'app' / 'quizes'
    
    if not quizes_folder.exists():
        print(f"Error: Quizes folder not found at {quizes_folder}")
        sys.exit(1)
    
    print(f"Cleaning up quiz files in: {quizes_folder}")
    print("-" * 60)
    
    quiz_files = list(quizes_folder.glob('*.json'))
    
    if not quiz_files:
        print("No quiz files found.")
        return
    
    cleaned_count = 0
    for quiz_file in quiz_files:
        print(f"\nProcessing: {quiz_file.name}")
        if cleanup_quiz_file(quiz_file):
            cleaned_count += 1
    
    print("\n" + "=" * 60)
    print(f"Cleanup complete! Modified {cleaned_count} out of {len(quiz_files)} quiz files.")

if __name__ == '__main__':
    main()

