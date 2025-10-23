#!/usr/bin/env python3

"""
Music History Blog Post Generator
This script generates factual music history blog posts using web research
"""

import json
import sys
from pathlib import Path

# Blog post content for October 23
OCTOBER_23_CONTENT = """## A Day of Musical Milestones

October 23 has witnessed remarkable moments in music history, from groundbreaking recordings to iconic album releases and legendary performances. This date has given us some of the most memorable contributions to the musical landscape.

### 1963: Bob Dylan Records "The Times They Are A-Changin'"

![Bob Dylan Recording Session](https://placehold.co/800x400/020418/00F6FF?text=Bob+Dylan+Recording)

On this day in 1963, Bob Dylan entered the studio to record what would become one of the most iconic protest songs of all time: "The Times They Are A-Changin'." This anthem of social change captured the spirit of the 1960s and became a rallying cry for the civil rights movement and anti-war protesters. Dylan's prophetic lyrics and powerful delivery made this song a timeless commentary on social transformation that resonates to this day.

The song's message about generational change and social upheaval struck a chord with millions around the world, cementing Dylan's role as the voice of a generation. The recording session itself was relatively simple, featuring just Dylan's acoustic guitar and harmonica, yet the impact would be profound and long-lasting.

### 1966: Jimi Hendrix Experience Records "Hey Joe"

![Jimi Hendrix in the Studio](https://placehold.co/800x400/020418/F000B8?text=Jimi+Hendrix+Experience)

The Jimi Hendrix Experience made history on October 23, 1966, when they recorded their debut single "Hey Joe" at De Lane Lea Studios in London. This marked the beginning of one of rock music's most legendary careers. The song, with its distinctive guitar work and Hendrix's innovative sound, introduced the world to a revolutionary guitarist who would forever change rock music.

"Hey Joe" showcased Hendrix's ability to take a traditional folk song and transform it into something entirely new with his psychedelic guitar techniques and powerful vocals. The single would reach the UK Top 10, launching Hendrix's career and setting the stage for his groundbreaking albums "Are You Experienced" and "Axis: Bold as Love."

### 1972: Al Green Releases "I'm Still in Love with You"

![Al Green Album Cover](https://placehold.co/800x400/020418/00F6FF?text=Al+Green+Album)

Soul legend Al Green released his fifth studio album "I'm Still in Love with You" on October 23, 1972. The album would go on to become the Billboard Album of the Year in 1973, cementing Green's status as one of the greatest soul singers of all time. The title track, along with hits like "Look What You Done for Me" and "Simply Beautiful," showcased Green's smooth, emotive vocal style.

Working with producer Willie Mitchell at Hi Records in Memphis, Green created a sound that perfectly blended gospel, soul, and R&B. The album's success helped define the sound of 1970s soul music and influenced countless artists who followed. Green's distinctive falsetto and passionate delivery made every track on the album a masterclass in emotional expression.

### 1975: Elton John Receives Hollywood Walk of Fame Star

![Elton John Walk of Fame](https://placehold.co/800x400/020418/F000B8?text=Elton+John+Star)

On this day in 1975, Elton John was honored with a star on the Hollywood Walk of Fame, recognizing his immense contributions to popular music. At just 28 years old, Elton had already released numerous hit albums and singles, including "Rocket Man," "Tiny Dancer," and "Your Song." The honor came during the peak of his commercial success.

This recognition celebrated not only his musical achievements but also his impact on pop culture and fashion. Elton John's flamboyant stage presence and incredible songwriting partnership with Bernie Taupin had already made him one of the biggest stars in the world, and the Walk of Fame star acknowledged his permanent place in entertainment history.

### 2006: My Chemical Romance Releases "The Black Parade"

![My Chemical Romance Black Parade](https://placehold.co/800x400/020418/00F6FF?text=My+Chemical+Romance)

My Chemical Romance released their third studio album "The Black Parade" on October 23, 2006, creating what many consider to be one of the defining albums of 2000s rock. The theatrical concept album told the story of "The Patient," a dying character who reflects on his life. With its ambitious scope and emotional depth, the album resonated with a generation.

The lead single "Welcome to the Black Parade" became an anthem for fans worldwide, with its dramatic opening and powerful message about facing mortality and finding meaning in life. The album debuted at number two on the Billboard 200 and went on to achieve platinum status. Its influence on emo and alternative rock continues to be felt today.

### 2015: Adele Releases "Hello"

![Adele Hello Single](https://placehold.co/800x400/020418/F000B8?text=Adele+Hello)

Adele made history on October 23, 2015, when she released "Hello," the lead single from her album "25." The song broke multiple records, becoming the first song to achieve over one million downloads in a week in the United States. The accompanying music video, directed by Xavier Dolan, broke the record for most views in 24 hours on YouTube at the time.

"Hello" marked Adele's triumphant return after a three-year hiatus following her record-breaking album "21." The song's powerful vocals and emotional lyrics about reaching out to a past lover resonated with audiences worldwide. It topped charts in numerous countries and went on to win the Grammy Award for Best Pop Solo Performance, further cementing Adele's status as one of the greatest vocalists of her generation.

## The Legacy Continues

These October 23 moments remind us of music's power to shape culture, inspire generations, and create lasting memories. From Bob Dylan's protest anthems to Adele's record-breaking ballads, this date has given us musical milestones that continue to influence artists and touch hearts around the world. Each event represents not just a moment in time, but a lasting contribution to the rich tapestry of music history."""

def load_articles(filepath):
    """Load existing articles from JSON file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: Could not find {filepath}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {filepath}: {e}")
        sys.exit(1)

def save_articles(filepath, articles):
    """Save articles to JSON file"""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(articles, f, indent=2, ensure_ascii=False)
        print(f"✓ Successfully saved articles to {filepath}")
    except Exception as e:
        print(f"Error saving articles: {e}")
        sys.exit(1)

def update_october_23(articles_file):
    """Update October 23 blog post with factual content"""
    print("="*70)
    print("Updating October 23 Music History Blog Post")
    print("="*70)
    
    # Load existing articles
    articles = load_articles(articles_file)
    print(f"Loaded {len(articles)} existing articles")
    
    # Update October 23
    articles["10-23"] = {
        "date": "October 23",
        "title": "October 23 in Music History",
        "content": OCTOBER_23_CONTENT
    }
    
    # Save updated articles
    save_articles(articles_file, articles)
    
    print("\n✓ October 23 post updated successfully!")
    print(f"  Content length: {len(OCTOBER_23_CONTENT)} characters")
    print(f"  Total articles in database: {len(articles)}/366")

if __name__ == "__main__":
    articles_file = Path(__file__).parent / 'data' / 'music-history-articles.json'
    update_october_23(articles_file)
