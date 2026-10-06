using System;
using System.Collections.ObjectModel;
using Xamarin.Forms;

namespace BrightwellNotes
{
    public partial class NotesPage : ContentPage
    {
        readonly ObservableCollection<string> notes = new ObservableCollection<string>();

        public NotesPage()
        {
            InitializeComponent();
            NoteList.ItemsSource = notes;
        }

        void OnNoteCompleted(object sender, EventArgs e)
        {
            if (!string.IsNullOrWhiteSpace(NewNote.Text))
            {
                notes.Insert(0, NewNote.Text.Trim());
                NewNote.Text = string.Empty;
            }
        }
    }
}
