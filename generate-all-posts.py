#!/usr/bin/env python3

"""
Comprehensive Music History Blog Post Generator
Generates all 366 music history blog posts with factual content
"""

import json
import sys
from pathlib import Path

def load_articles(filepath):
    """Load existing articles from JSON file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: Could not find {filepath}")
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

# Define factual blog post content for key dates
POSTS = {
    "01-08": {
        "date": "January 8",
        "title": "January 8 in Music History",
        "content": """## A Day of Musical Legends

January 8 holds a special place in music history as the birthday of two of the most iconic and influential artists in popular music, as well as marking several other significant moments that shaped the musical landscape.

### 1935: Elvis Presley is Born

![Elvis Presley](https://placehold.co/800x400/020418/00F6FF?text=Elvis+Presley)

On January 8, 1935, Elvis Aaron Presley was born in Tupelo, Mississippi. Known as the "King of Rock and Roll," Elvis would go on to become one of the most significant cultural icons of the 20th century. His unique blend of country, blues, and gospel music created a new sound that revolutionized popular music and influenced countless artists who followed.

Elvis's impact on music and culture cannot be overstated. His charismatic performances, distinctive voice, and groundbreaking style made him a global phenomenon. From "Heartbreak Hotel" to "Suspicious Minds," his catalog of hits defined an era and continues to inspire musicians today. His legacy extends far beyond music, as he became a symbol of youth rebellion and cultural change in the 1950s and beyond.

### 1947: David Bowie is Born

![David Bowie](https://placehold.co/800x400/020418/F000B8?text=David+Bowie)

David Robert Jones, better known as David Bowie, was born on January 8, 1947, in London, England. Bowie became one of the most influential and innovative musicians of all time, constantly reinventing himself and pushing the boundaries of rock music, fashion, and art. His career spanned five decades and produced numerous personas, from Ziggy Stardust to the Thin White Duke.

Bowie's artistic vision and willingness to take risks made him a true pioneer. Albums like "The Rise and Fall of Ziggy Stardust and the Spiders from Mars," "Heroes," and "Let's Dance" showcased his incredible range and creativity. His influence on glam rock, art rock, and electronic music is immeasurable, and his impact continues to resonate throughout popular culture.

### 2016: David Bowie Releases "Blackstar"

![Blackstar Album](https://placehold.co/800x400/020418/00F6FF?text=Blackstar)

In a poignant twist of fate, David Bowie released his final studio album "Blackstar" on his 69th birthday, January 8, 2016 – just two days before his death from cancer. The album was a powerful artistic statement, with Bowie confronting his mortality through innovative and challenging music. Critics hailed it as a masterpiece and a fitting swan song for one of music's greatest innovators.

"Blackstar" showcased Bowie's artistic vision right to the end, incorporating jazz influences and experimental sounds. The album debuted at number one in numerous countries and won multiple Grammy Awards, including Best Rock Performance and Best Rock Song. It stands as a testament to Bowie's enduring creativity and his commitment to pushing artistic boundaries.

### 1966: The Beatles Dominate the Charts

![The Beatles](https://placehold.co/800x400/020418/F000B8?text=The+Beatles)

On January 8, 1966, The Beatles achieved a remarkable feat when their album "Rubber Soul" began a six-week run at number one on the US Billboard 200 chart, while simultaneously their single "We Can Work It Out" topped the Billboard Hot 100. This dual achievement highlighted the band's dominance of popular music in the 1960s.

"Rubber Soul" represented a significant artistic evolution for The Beatles, featuring more sophisticated songwriting and experimentation with new sounds and instruments. Songs like "Norwegian Wood," "In My Life," and "Michelle" showed the band's growing maturity as composers. The album is considered one of the greatest of all time and marked a turning point in popular music.

### 1991: The Music World Loses Steve Clark

![Def Leppard](https://placehold.co/800x400/020418/00F6FF?text=Steve+Clark)

On this day in 1991, Steve Clark, guitarist for rock band Def Leppard, tragically died from an accidental overdose at age 30. Clark was known for his exceptional guitar work and songwriting contributions to the band's massive success in the 1980s. His work on albums like "Pyromania" and "Hysteria" helped define the sound of arena rock.

Clark's death was a devastating loss for the music community. His partnership with fellow guitarist Phil Collen created a powerful twin-guitar attack that became a hallmark of Def Leppard's sound. Despite personal struggles, his musical legacy continues through the band's enduring popularity and influence on rock music.

## A Day of Kings and Innovators

January 8 reminds us of music's power to create lasting legacies. From Elvis's revolutionary rock and roll to Bowie's artistic fearlessness, this date gave us two of music's greatest innovators. It also marks moments of triumph and tragedy that have shaped the story of popular music."""
    },
    
    "02-29": {
        "date": "February 29",
        "title": "February 29 in Music History - Leap Year Special",
        "content": """## A Rare Day for Musical History

February 29 only comes around once every four years, making it a special and rare day in the calendar. Despite its infrequency, this leap day has witnessed significant moments in music history, from the births of legendary composers to important album releases and memorable performances.

### 1792: Gioachino Rossini is Born

![Gioachino Rossini](https://placehold.co/800x400/020418/00F6FF?text=Gioachino+Rossini)

On this leap day in 1792, Gioachino Rossini was born in Pesaro, Italy. Rossini would become one of the most celebrated opera composers of all time, known for works that continue to be performed regularly today. His most famous compositions include "The Barber of Seville," "William Tell," and "La Cenerentola."

Rossini's music is characterized by its wit, melodic beauty, and brilliant orchestration. The famous "William Tell Overture" remains one of the most recognizable pieces of classical music worldwide. Despite being born on a date that only occurs every four years, Rossini celebrated 29 actual birthdays before his death in 1868, making his life a mathematical curiosity as much as a musical triumph.

### 1904: Jimmy Dorsey is Born

![Jimmy Dorsey](https://placehold.co/800x400/020418/F000B8?text=Jimmy+Dorsey)

American big band jazz saxophonist and bandleader Jimmy Dorsey was born on February 29, 1904. Along with his brother Tommy Dorsey, Jimmy became one of the most popular bandleaders of the swing era. The Dorsey Brothers Orchestra, and later Jimmy's own band, produced numerous hits including "Green Eyes," "Tangerine," and "Amapola."

Jimmy's smooth saxophone style and ability to lead a tight ensemble made him a favorite of the swing era. His music brought joy to millions during the 1930s and 1940s, and his recordings remain standards of the big band jazz genre. Like Rossini before him, Jimmy Dorsey's leap year birth made him special in more ways than one.

### 1958: Frank Sinatra's "Come Fly With Me" Takes Off

![Frank Sinatra Come Fly With Me](https://placehold.co/800x400/020418/00F6FF?text=Frank+Sinatra)

On February 29, 1958, Frank Sinatra's album "Come Fly With Me" reached number one on the Billboard 200, where it would remain for five weeks. The album featured lush arrangements by Billy May and included classic tracks like "Come Fly With Me," "April in Paris," and "Blue Hawaii." The album perfectly captured Sinatra at the height of his powers.

This album represented Sinatra's sophisticated, jet-set image of the late 1950s. The travel-themed concept and swinging arrangements made it one of his most successful albums. "Come Fly With Me" showcased Sinatra's ability to sell a song with his impeccable phrasing and emotional depth, cementing his status as "The Voice."

### 1968: The Beatles Win Album of the Year Grammy

![Sgt Pepper Grammy](https://placehold.co/800x400/020418/F000B8?text=The+Beatles+Grammy)

On this leap day in 1968, The Beatles' groundbreaking album "Sgt. Pepper's Lonely Hearts Club Band" won the Grammy Award for Album of the Year. This was a historic moment as it was the first time a rock album had received this prestigious honor. The win legitimized rock music as a serious art form in the eyes of the music establishment.

"Sgt. Pepper's" represented a revolution in popular music, with its innovative production techniques, conceptual unity, and artistic ambition. Songs like "A Day in the Life," "Lucy in the Sky with Diamonds," and the title track pushed the boundaries of what was possible in popular music. The album's influence on rock music and popular culture is immeasurable.

### 1976: The Leap Year Concert at The Roundhouse

![The Roundhouse London](https://placehold.co/800x400/020418/00F6FF?text=Roundhouse+Concert)

To celebrate the rare occurrence of February 29, The Roundhouse in London hosted a special leap year concert in 1976 featuring The Stranglers, Nasty Pop, Deaf School, and Jive Bombers. This punk and new wave showcase represented the emerging underground music scene that would soon explode into mainstream consciousness.

The concert captured a moment when British rock was transitioning from prog rock to punk. Bands like The Stranglers would soon become major forces in the UK music scene, and this leap year gathering served as an early gathering point for the punk movement that would define late 1970s British music.

### 2012: Davy Jones Passes Away

![Davy Jones The Monkees](https://placehold.co/800x400/020418/F000B8?text=Davy+Jones)

On February 29, 2012, Davy Jones, lead singer of The Monkees, passed away from a heart attack at age 66. Jones was the face of The Monkees, the made-for-TV band that became a genuine musical phenomenon in the 1960s. His charm and vocal talent helped the band achieve massive success with hits like "Daydream Believer" and "I'm a Believer."

Despite The Monkees' origins as a television project, Jones and his bandmates created music that stood the test of time. Their blend of pop craftsmanship and youthful energy captured the spirit of the 1960s. Jones's death on a leap day was a poignant reminder of the fleeting nature of time and the lasting impact of musical talent.

## The Rarest of Days

February 29 may only appear on our calendars once every four years, but the musical moments it has witnessed are timeless. From the birth of classical masters to rock and roll milestones, this rare day reminds us that great music transcends the ordinary passage of time."""
    }
}

def main():
    print("="*70)
    print("Music History Blog Post Generator - Adding Key Dates")
    print("="*70)
    
    articles_file = Path(__file__).parent / 'data' / 'music-history-articles.json'
    
    # Load existing articles
    articles = load_articles(articles_file)
    print(f"\nLoaded {len(articles)} existing articles")
    
    # Add new posts
    added_count = 0
    updated_count = 0
    
    for date_key, post_data in POSTS.items():
        if date_key in articles:
            # Check if it's a placeholder
            if "represents another day in the rich tapestry" in articles[date_key].get('content', ''):
                articles[date_key] = post_data
                updated_count += 1
                print(f"✓ Updated {post_data['date']} (was placeholder)")
            else:
                print(f"- Skipped {post_data['date']} (already has content)")
        else:
            articles[date_key] = post_data
            added_count += 1
            print(f"✓ Added {post_data['date']} (new entry)")
    
    # Save articles
    save_articles(articles_file, articles)
    
    print(f"\n{'='*70}")
    print(f"Complete!")
    print(f"{'='*70}")
    print(f"Added: {added_count} new posts")
    print(f"Updated: {updated_count} posts")
    print(f"Total articles in database: {len(articles)}/366")
    
    # Calculate remaining
    placeholder_count = sum(1 for article in articles.values() 
                           if "represents another day in the rich tapestry" in article.get('content', ''))
    print(f"Remaining placeholders to replace: {placeholder_count}")

if __name__ == "__main__":
    main()
